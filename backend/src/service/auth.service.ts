import { AppError } from "../errors/AppError.js";
import { sendVerificationEmail } from "../lib/email.js";
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
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
  signAccessToken,
} from "../lib/tokens.js";
import {
  authUsersRepository,
  type AuthUsersRepository,
} from "../repositories/authUsers.repository.js";
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
  LoginInput,
  LoginResult,
  MessageResult,
  RegisterInput,
  RegisterResult,
  ResendCodeInput,
  VerifyEmailInput,
} from "../types/auth.types.js";

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
  repository: AuthUsersRepository = authUsersRepository,
  usuariosRepo: UsuariosAuthRepository = usuariosAuthRepository,
  codes: VerificationCodesRepository = verificationCodesRepository,
  sessions: RefreshTokensRepository = refreshTokensRepository
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

    // Login: bloqueo por intentos, mensaje único, correo verificado obligatorio.
    async login(input: LoginInput): Promise<LoginResult> {
      try {
        const user = await usuariosRepo.findForLogin(input.email);

        if (user?.bloqueadoHasta && user.bloqueadoHasta.getTime() > Date.now()) {
          throw new AppError(
            429,
            "Cuenta bloqueada temporalmente por demasiados intentos. Intenta más tarde."
          );
        }

        // Siempre se compara un hash, exista o no el usuario.
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

    // Renueva la sesión rotando el refresh token.
    async refresh(token: string | undefined): Promise<AuthTokens> {
      try {
        if (!token) throw new AppError(401, SESION_INVALIDA);

        const stored = await sessions.findByHash(hashRefreshToken(token));
        if (!stored) throw new AppError(401, SESION_INVALIDA);

        // Token ya usado: posible robo, se cierran todas las sesiones.
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

    // Revoca el refresh token si existe. No falla si no hay sesión.
    async logout(token: string | undefined): Promise<void> {
      try {
        if (!token) return;
        const stored = await sessions.findByHash(hashRefreshToken(token));
        if (stored && !stored.revoked) await sessions.revoke(stored.id);
      } catch (error: unknown) {
        return toAppError(error);
      }
    },
  };
}

export const authService = createAuthService();