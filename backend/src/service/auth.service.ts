import { AppError } from "../errors/AppError.js";
import {
  authUsersRepository,
  type AuthUsersRepository,
} from "../repositories/authUsers.repository.js";
import {
  usuariosAuthRepository,
  type UsuariosAuthRepository,
} from "../repositories/usuariosAuth.repository.js";
import {
  verificationCodesRepository,
  type VerificationCodesRepository,
} from "../repositories/verificationCodes.repository.js";
import type {
  CreateAdminInput,
  MessageResult,
  RegisterInput,
  RegisterResult,
  ResendCodeInput,
  VerifyEmailInput,
} from "../types/auth.types.js";
import { sendVerificationEmail } from "../lib/email.js";
import { hashPassword } from "../lib/hash.js";
import {
  generateOtp,
  hashOtp,
  otpExpiresAt,
  verifyOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../lib/otp.js";

export interface CreateAdminResult {
  message: string;
  userId: string;
  emailSendError?: boolean;
}

// Mensaje único para todo fallo de verificación (no revela el motivo).
const CODIGO_INVALIDO = "Código inválido o expirado.";

// Respuesta única de reenvío, exista o no el correo (anti-enumeración).
const REENVIO_GENERICO =
  "Si el correo está registrado y pendiente de verificar, recibirás un nuevo código.";

/**
 * Construye el servicio de autenticación.
 *
 * Recibe los repositorios como dependencia para facilitar las pruebas.
 * Los datos de entrada ya llegan validados y limpios desde el validator.
 */
export function createAuthService(
  repository: AuthUsersRepository = authUsersRepository,
  usuariosRepo: UsuariosAuthRepository = usuariosAuthRepository,
  codes: VerificationCodesRepository = verificationCodesRepository
) {
  // Genera un código nuevo (invalida los anteriores) y lo envía por correo.
  async function emitirCodigo(
    userId: string,
    email: string,
    nombres: string
  ): Promise<boolean> {
    const code = generateOtp();
    await codes.replaceForUser(userId, await hashOtp(code), otpExpiresAt());
    return sendVerificationEmail(email, nombres, code);
  }

  // Los errores esperados pasan tal cual; el resto se registra y se oculta.
  function toAppError(error: unknown): never {
    if (error instanceof AppError) throw error;

    console.error("Error detallado en servidor:", error);
    throw new AppError(
      500,
      "Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo."
    );
  }

  return {
    async createAdmin(input: CreateAdminInput): Promise<CreateAdminResult> {
      try {
        // 1. Crear la cuenta mediante el repositorio.
        const created = await repository.create(input);

        if (!created.ok) {
          throw new AppError(created.status || 400, created.message);
        }

        // 2. Solicitar el correo de verificación.
        const emailSent = await repository.resendSignupEmail(input.email);

        // 3. La cuenta existe, pero el correo no salió.
        if (!emailSent) {
          return {
            message:
              "Administrador creado, pero hubo un problema enviando el código de verificación. Puede reenviarlo desde la pantalla de verificación.",
            userId: created.userId,
            emailSendError: true,
          };
        }

        // 4. Todo salió bien.
        return {
          message:
            "Administrador creado. Debe verificar su correo con el código enviado.",
          userId: created.userId,
        };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    // Registro público: crea un cliente en Neon y envía el código OTP.
    async register(input: RegisterInput): Promise<RegisterResult> {
      try {
        // 1. Correo duplicado (el UNIQUE de la BD cubre la carrera).
        if (await usuariosRepo.existsByEmail(input.email)) {
          throw new AppError(409, "Ese correo ya está registrado.");
        }

        // 2. Hash de la contraseña (nunca se guarda en texto plano).
        const passwordHash = await hashPassword(input.password);

        // 3. Crear usuario con email_verified = false.
        const userId = await usuariosRepo.createCliente({
          nombres: input.nombres,
          apellidos: input.apellidos,
          email: input.email,
          passwordHash,
        });

        // 4. Código OTP por correo. Si falla, la cuenta existe y puede reenviarse.
        const sent = await emitirCodigo(userId, input.email, input.nombres);

        if (!sent) {
          return {
            message:
              "Cuenta creada, pero no pudimos enviar el código. Solicita un reenvío.",
            userId,
            emailSendError: true,
          };
        }

        return {
          message: "Cuenta creada. Revisa tu correo e ingresa el código.",
          userId,
        };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    // Verifica el código de 6 dígitos y marca el correo como verificado.
    async verifyEmail(input: VerifyEmailInput): Promise<MessageResult> {
      try {
        const user = await usuariosRepo.findAuthByEmail(input.email);

        // Usuario inexistente o ya verificado: mismo error genérico.
        if (!user || user.emailVerified) {
          throw new AppError(400, CODIGO_INVALIDO);
        }

        const active = await codes.findActive(user.idusuario);

        if (!active || active.expiresAt.getTime() < Date.now()) {
          throw new AppError(400, CODIGO_INVALIDO);
        }

        // Código agotado: se invalida y hay que pedir uno nuevo.
        if (active.intentos >= OTP_MAX_ATTEMPTS) {
          await codes.markUsed(active.id);
          throw new AppError(
            429,
            "Demasiados intentos. Solicita un nuevo código."
          );
        }

        if (!(await verifyOtp(input.code, active.codeHash))) {
          await codes.incrementAttempts(active.id);
          throw new AppError(400, CODIGO_INVALIDO);
        }

        await codes.markUsed(active.id);
        await usuariosRepo.markEmailVerified(user.idusuario);

        return { message: "Correo verificado correctamente." };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    // Reenvía el código respetando el cooldown. Respuesta siempre genérica.
    async resendCode(input: ResendCodeInput): Promise<MessageResult> {
      try {
        const user = await usuariosRepo.findAuthByEmail(input.email);

        if (user && !user.emailVerified) {
          const latest = await codes.findLatest(user.idusuario);
          const elapsed = latest
            ? (Date.now() - latest.creadoEn.getTime()) / 1000
            : Infinity;

          if (elapsed >= OTP_RESEND_COOLDOWN_SECONDS) {
            await emitirCodigo(user.idusuario, input.email, user.nombres);
          }
        }

        return { message: REENVIO_GENERICO };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },
  };
}

export const authService = createAuthService();