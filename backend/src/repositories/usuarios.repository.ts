import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { PerfilUsuario, TipoUsuario } from "../types/usuario.types.js";

// Columnas que expone el perfil. Lista explícita (nunca "*"): aunque
// Prisma no filtra columnas por defecto, dejamos claro qué se expone.
const PERFIL_SELECT = {
  idusuario: true,
  nombres: true,
  apellidos: true,
  tipoUsuario: true,
  tiempoRegistrado: true,
  tiempoDuracionInscripcion: true,
} as const;

export function createUsuariosRepository() {
  return {
    // Devuelve el rol del usuario, o null si no existe.
    async findRoleById(idUsuario: string): Promise<TipoUsuario | null> {
      try {
        const user = await prisma.usuario.findUnique({
          where: { idusuario: idUsuario },
          select: { tipoUsuario: true },
        });

        return user ? (user.tipoUsuario as TipoUsuario) : null;
      } catch (error) {
        console.error("Error al obtener el rol:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // Devuelve el perfil, o null si no existe.
    async findProfileById(idUsuario: string): Promise<PerfilUsuario | null> {
      try {
        const user = await prisma.usuario.findUnique({
          where: { idusuario: idUsuario },
          select: PERFIL_SELECT,
        });

        if (!user) return null;

        return {
          idusuario: user.idusuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          tipo_usuario: user.tipoUsuario as TipoUsuario,
          tiempo_registrado: user.tiempoRegistrado,
          tiempo_duracion_inscripcion: user.tiempoDuracionInscripcion,
        };
      } catch (error) {
        console.error("Error al obtener el perfil:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // AÑADIDO: Buscar por email para ascender a admin
    async findByEmail(correo: string) {
      try {
        return await prisma.usuario.findUnique({
          where: { correo },
        });
      } catch (error) {
        console.error("Error al buscar por email:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // AÑADIDO: Actualizar el rol de un usuario
    async updateRole(idusuario: string, tipoUsuario: string) {
      try {
        return await prisma.usuario.update({
          where: { idusuario },
          data: { tipoUsuario },
        });
      } catch (error) {
        console.error("Error al actualizar el rol:", error);
        throw new AppError(500, "Error al actualizar el rol en la base de datos.");
      }
    },

    // AÑADIDO: Crear administrador directamente (si no existe)
    async createAdmin(data: {
      nombres: string;
      apellidos: string;
      email: string;
      passwordHash: string;
      tipoUsuario: string;
    }) {
      try {
        const user = await prisma.usuario.create({
          data: {
            idusuario: crypto.randomUUID(),
            nombres: data.nombres,
            apellidos: data.apellidos,
            correo: data.email,
            passwordHash: data.passwordHash,
            tipoUsuario: data.tipoUsuario,
            emailVerified: false, // Se verifica luego con OTP
          },
          select: { idusuario: true }
        });
        return user.idusuario;
      } catch (error) {
        console.error("Error al crear admin:", error);
        throw new AppError(500, "Error al crear el administrador en la base de datos.");
      }
    },
  };
}

export type UsuariosRepository = ReturnType<typeof createUsuariosRepository>;

// Instancia por defecto para producción.
export const usuariosRepository = createUsuariosRepository();