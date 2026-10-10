import { AppError } from "../errors/AppError.js";
import {
  authUsersRepository,
  type AuthUsersRepository,
} from "../repositories/authUsers.repository.js";
import type { CreateAdminInput } from "../types/auth.types.js";
import {
  usuariosAuthRepository,
  type UsuariosAuthRepository,
} from "../repositories/usuariosAuth.repository.js";
import { hashPassword } from "../lib/hash.js";
import type { RegisterInput, RegisterResult } from "../types/auth.types.js";

export interface CreateAdminResult {
  message: string;
  userId: string;
  emailSendError?: boolean;
}

/**
 * Construye el servicio de autenticación.
 *
 * Recibe el repositorio como dependencia para facilitar las pruebas.
 * Los datos de entrada ya llegan validados y limpios desde el validator.
 */
export function createAuthService(
  repository: AuthUsersRepository = authUsersRepository,
  usuariosRepo: UsuariosAuthRepository = usuariosAuthRepository
) {
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
        // Los errores esperados pasan tal cual; cualquier otro se registra
        // y se oculta detrás de un mensaje genérico.
        if (error instanceof AppError) {
          throw error;
        }

        console.error("Error detallado en servidor:", error);

        throw new AppError(
          500,
          "Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo."
        );
      }
    },
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

        // TODO (fase OTP): generar y enviar el código de 6 dígitos.
        return {
          message:
            "Cuenta creada. Falta verificar el correo (pendiente de implementar).",
          userId,
        };
      } catch (error: unknown) {
        if (error instanceof AppError) throw error;

        console.error("Error detallado en servidor:", error);
        throw new AppError(
          500,
          "Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo."
        );
      }
    },
  };
}

export const authService = createAuthService();