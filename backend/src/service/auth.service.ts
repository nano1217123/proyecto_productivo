import { AppError } from "../errors/AppError.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email.js";
import { comparePassword, hashPassword } from "../lib/hash.js";
import {
  generateOtp,
  hashOtp,
  otpExpiresAt,
  verifyOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../lib/otp.js";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiresAt,
  RESET_TOKEN_TTL_MINUTES,
} from "../lib/resetToken.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
  signAccessToken,
} from "../lib/tokens.js";
import {
  passwordResetRepository,
  type PasswordResetRepository,
} from "../repositories/passwordReset.repository.js";
import {
  refreshTokensRepository,
  type RefreshTokensRepository,
} from "../repositories/refreshTokens.repository.js";
import {
  usuariosAuthRepository,
  type UsuariosAuthRepository,
} from "../repositories/usuariosAuth.repository.js";
import {
  verificationCodesRepository,
  type VerificationCodesRepository,
} from "../repositories/verificationCodes.repository.js";
import type {
  AuthTokens,
  CreateAdminInput,
  CreateAdminResult,
  ForgotPasswordInput,
  LoginInput,
  LoginResult,
  MessageResult,
  RegisterInput,
  RegisterResult,
  ResendCodeInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "../types/auth.types.js";

// Mensaje único para todo fallo de verificación (no revela el motivo).
const CODIGO_INVALIDO = "Código inválido o expirado.";

// Respuesta única de reenvío, exista o no el correo (anti-enumeración).
const REENVIO_GENERICO =
  "Si el correo está registrado y pendiente de verificar, recibirás un nuevo código.";

const CREDENCIALES_INVALIDAS = "Credenciales inválidas.";
const SESION_INVALIDA = "Sesión inválida o expirada.";
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

// Hash falso para que el login de un correo inexistente tarde lo mismo
// que uno real (evita enumerar usuarios midiendo tiempos).
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("contraseña-de-relleno-1A");
  return dummyHash;
}

/**
 * Construye el servicio de autenticación.
 *
 * Recibe los repositorios como dependencia para facilitar las pruebas.
 * Los datos de entrada ya llegan validados y limpios desde el validator.
 */
export function createAuthService(
  usuariosRepo: UsuariosAuthRepository = usuariosAuthRepository,
  codes: VerificationCodesRepository = verificationCodesRepository,
  sessions: RefreshTokensRepository = refreshTokensRepository,
  resets: PasswordResetRepository = passwordResetRepository
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

  // Crea un refresh token nuevo (guarda su hash) y firma el access token.
  async function abrirSesion(
    userId: string,
    email: string
  ): Promise<AuthTokens> {
    const refreshToken = generateRefreshToken();
    await sessions.create(
      userId,
      hashRefreshToken(refreshToken),
      refreshExpiresAt()
    );
    return {
      accessToken: signAccessToken({ sub: userId, email }),
      refreshToken,
    };
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
    // ============================================================
    // ADMIN
    // ============================================================

    // Crea un admin_gimnasio o super_admin desde el panel de super_admin.
    async createAdmin(input: CreateAdminInput): Promise<CreateAdminResult> {
      try {
        if (await usuariosRepo.existsByEmail(input.email)) {
          throw new AppError(409, "Ese correo ya está registrado.");
        }

        const passwordHash = await hashPassword(input.password);

        const userId = await usuariosRepo.createAdmin({
          nombres: input.nombres,
          apellidos: input.apellidos,
          email: input.email,
          passwordHash,
          tipoUsuario: input.tipoUsuario,
        });

        const sent = await emitirCodigo(userId, input.email, input.nombres);

        if (!sent) {
          return {
            message:
              "Administrador creado, pero no pudimos enviar el código. Solicita un reenvío.",
            userId,
            emailSendError: true,
          };
        }

        return {
          message:
            "Administrador creado. Debe verificar su correo con el código enviado.",
          userId,
        };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    // ============================================================
    // REGISTRO Y VERIFICACIÓN
    // ============================================================

    async register(input: RegisterInput): Promise<RegisterResult> {
      try {
        if (await usuariosRepo.existsByEmail(input.email)) {
          throw new AppError(409, "Ese correo ya está registrado.");
        }

        const passwordHash = await hashPassword(input.password);

        const userId = await usuariosRepo.createCliente({
          nombres: input.nombres,
          apellidos: input.apellidos,
          email: input.email,
          passwordHash,
        });

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

    async verifyEmail(input: VerifyEmailInput): Promise<MessageResult> {
      try {
        const user = await usuariosRepo.findAuthByEmail(input.email);

        if (!user || user.emailVerified) {
          throw new AppError(400, CODIGO_INVALIDO);
        }

        const active = await codes.findActive(user.idusuario);

        if (!active || active.expiresAt.getTime() < Date.now()) {
          throw new AppError(400, CODIGO_INVALIDO);
        }

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

    // ============================================================
    // SESIÓN
    // ============================================================

    async login(input: LoginInput): Promise<LoginResult> {
      try {
        const user = await usuariosRepo.findForLogin(input.email);

        if (user?.bloqueadoHasta && user.bloqueadoHasta.getTime() > Date.now()) {
          throw new AppError(
            429,
            "Cuenta bloqueada temporalmente por demasiados intentos. Intenta más tarde."
          );
        }

        const hash = user?.passwordHash ?? (await getDummyHash());
        const passwordOk = await comparePassword(input.password, hash);

        if (!user || !user.passwordHash || !passwordOk) {
          if (user) {
            await usuariosRepo.registerFailedLogin(
              user.idusuario,
              LOGIN_MAX_ATTEMPTS,
              LOGIN_LOCK_MS
            );
          }
          throw new AppError(401, CREDENCIALES_INVALIDAS);
        }

        if (!user.emailVerified) {
          throw new AppError(
            403,
            "Debes verificar tu correo antes de iniciar sesión."
          );
        }

        await usuariosRepo.resetFailedLogins(user.idusuario);
        const tokens = await abrirSesion(user.idusuario, user.correo);

        return {
          ...tokens,
          user: {
            idusuario: user.idusuario,
            nombres: user.nombres,
            apellidos: user.apellidos,
            tipoUsuario: user.tipoUsuario,
          },
        };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    async refresh(token: string | undefined): Promise<AuthTokens> {
      try {
        if (!token) throw new AppError(401, SESION_INVALIDA);

        const stored = await sessions.findByHash(hashRefreshToken(token));
        if (!stored) throw new AppError(401, SESION_INVALIDA);

        if (stored.revoked) {
          await sessions.revokeAllForUser(stored.usuarioId);
          throw new AppError(401, SESION_INVALIDA);
        }

        if (stored.expiresAt.getTime() < Date.now()) {
          throw new AppError(401, SESION_INVALIDA);
        }

        const user = await usuariosRepo.findSessionById(stored.usuarioId);
        if (!user || !user.emailVerified) {
          throw new AppError(401, SESION_INVALIDA);
        }

        const refreshToken = generateRefreshToken();
        await sessions.rotate(
          stored.id,
          user.idusuario,
          hashRefreshToken(refreshToken),
          refreshExpiresAt()
        );

        return {
          accessToken: signAccessToken({
            sub: user.idusuario,
            email: user.correo,
          }),
          refreshToken,
        };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    async logout(token: string | undefined): Promise<void> {
      try {
        if (!token) return;
        const stored = await sessions.findByHash(hashRefreshToken(token));
        if (stored && !stored.revoked) await sessions.revoke(stored.id);
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    // ============================================================
    // RECUPERACIÓN DE CONTRASEÑA
    // ============================================================

    async forgotPassword(input: ForgotPasswordInput): Promise<MessageResult> {
      try {
        const user = await usuariosRepo.findAuthByEmail(input.email);

        if (user && user.emailVerified) {
          const token = generateResetToken();
          await resets.replaceForUser(
            user.idusuario,
            hashResetToken(token),
            resetTokenExpiresAt()
          );

          const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
          await sendPasswordResetEmail(
            input.email,
            user.nombres,
            resetUrl,
            RESET_TOKEN_TTL_MINUTES
          );
        }

        // Respuesta genérica: no revela si el correo existe.
        return {
          message:
            "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
        };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },

    async resetPassword(input: ResetPasswordInput): Promise<MessageResult> {
      try {
        const tokenHash = hashResetToken(input.token);
        const stored = await resets.findActive(tokenHash);

        if (!stored) {
          throw new AppError(400, "Token inválido o expirado.");
        }

        const passwordHash = await hashPassword(input.password);

        await prisma.usuario.update({
          where: { idusuario: stored.usuarioId },
          data: { passwordHash },
        });

        await resets.markUsed(stored.id);
        // Revoca todas las sesiones activas por seguridad.
        await sessions.revokeAllForUser(stored.usuarioId);

        return { message: "Contraseña actualizada. Inicia sesión de nuevo." };
      } catch (error: unknown) {
        return toAppError(error);
      }
    },
  };
}

export const authService = createAuthService();