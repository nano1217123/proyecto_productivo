import { prisma } from "../lib/prisma.js";
import { generateId } from "../lib/uuid.js";
import { AppError } from "../errors/AppError.js";

// Código de Prisma para violación de restricción única (ej. correo repetido).
const UNIQUE_VIOLATION = "P2002";

export interface NuevoCliente {
  nombres: string;
  apellidos: string;
  email: string;
  passwordHash: string;
}

// Repositorio de usuarios sobre Neon (Prisma). Es el único lugar que
// accede a la tabla "usuarios" para el flujo de registro.
// Factory function: permite inyectar otro cliente en las pruebas.
export function createUsuariosAuthRepository(db: typeof prisma = prisma) {
  return {
    // Devuelve true si ya existe un usuario con ese correo.
    async existsByEmail(email: string): Promise<boolean> {
      const user = await db.usuario.findUnique({
        where: { correo: email },
        select: { idusuario: true },
      });
      return user !== null;
    },
        // Datos mínimos para el flujo de verificación, o null.
    async findAuthByEmail(email: string): Promise<{
      idusuario: string;
      nombres: string;
      emailVerified: boolean;
    } | null> {
      return db.usuario.findUnique({
        where: { correo: email },
        select: { idusuario: true, nombres: true, emailVerified: true },
      });
    },

    async markEmailVerified(idUsuario: string): Promise<void> {
      await db.usuario.update({
        where: { idusuario: idUsuario },
        data: { emailVerified: true },
      });
    },

    // Crea un cliente con email_verified = false.
    // Devuelve solo el id (nunca el hash).
    async createCliente(input: NuevoCliente): Promise<string> {
      try {
        const user = await db.usuario.create({
          data: {
            idusuario: generateId(), // UUID v7
            nombres: input.nombres,
            apellidos: input.apellidos,
            correo: input.email,
            passwordHash: input.passwordHash,
            tipoUsuario: "cliente",
            emailVerified: false,
            provider: "email",
          },
          select: { idusuario: true },
        });
        return user.idusuario;
      } catch (error: unknown) {
        // Carrera: dos registros simultáneos con el mismo correo.
        if (
          typeof error === "object" &&
          error !== null &&
          (error as { code?: string }).code === UNIQUE_VIOLATION
        ) {
          throw new AppError(409, "Ese correo ya está registrado.");
        }
        throw error;
      }
    },

        // Datos necesarios para validar el login, o null.
    async findForLogin(email: string) {
      return db.usuario.findUnique({
        where: { correo: email },
        select: {
          idusuario: true,
          nombres: true,
          apellidos: true,
          correo: true,
          passwordHash: true,
          tipoUsuario: true,
          emailVerified: true,
          bloqueadoHasta: true,
        },
      });
    },

    // Suma un fallo; al llegar al máximo bloquea la cuenta y reinicia el contador.
    async registerFailedLogin(
      idUsuario: string,
      maxAttempts: number,
      lockMs: number
    ): Promise<void> {
      const user = await db.usuario.update({
        where: { idusuario: idUsuario },
        data: { intentosFallidos: { increment: 1 } },
        select: { intentosFallidos: true },
      });

      if (user.intentosFallidos >= maxAttempts) {
        await db.usuario.update({
          where: { idusuario: idUsuario },
          data: {
            intentosFallidos: 0,
            bloqueadoHasta: new Date(Date.now() + lockMs),
          },
        });
      }
    },

    async resetFailedLogins(idUsuario: string): Promise<void> {
      await db.usuario.update({
        where: { idusuario: idUsuario },
        data: { intentosFallidos: 0, bloqueadoHasta: null },
      });
    },

    // Datos para renovar sesión, o null.
    async findSessionById(
      idUsuario: string
    ): Promise<{ idusuario: string; correo: string; emailVerified: boolean } | null> {
      return db.usuario.findUnique({
        where: { idusuario: idUsuario },
        select: { idusuario: true, correo: true, emailVerified: true },
      });
    },

        // Crea un admin o super_admin con email_verified = false.
    // Devuelve solo el id (nunca el hash).
    async createAdmin(input: NuevoCliente & { tipoUsuario: "admin" | "super_admin" }): Promise<string> {
      try {
        const user = await db.usuario.create({
          data: {
            idusuario: generateId(),
            nombres: input.nombres,
            apellidos: input.apellidos,
            correo: input.email,
            passwordHash: input.passwordHash,
            tipoUsuario: input.tipoUsuario,
            emailVerified: false,
            provider: "email",
          },
          select: { idusuario: true },
        });
        return user.idusuario;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          (error as { code?: string }).code === UNIQUE_VIOLATION
        ) {
          throw new AppError(409, "Ese correo ya está registrado.");
        }
        throw error;
      }
    },
  };
}

export type UsuariosAuthRepository = ReturnType<
  typeof createUsuariosAuthRepository
>;

export const usuariosAuthRepository = createUsuariosAuthRepository();