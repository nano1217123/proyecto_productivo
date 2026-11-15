import { AppError } from "../errors/AppError.js";
import {
  resenasRepository,
  type ResenasRepository,
} from "../repositories/resenas.repository.js";
import type {
  CreateResenaInput,
  ResenaOutput,
} from "../types/resenas.types.js";
import type { TipoUsuario } from "../types/usuario.types.js";
export function createResenasService(
  repository: ResenasRepository = resenasRepository
) {
  return {
    // Permite que un cliente publique una reseña.
    async create(
      usuarioId: string,
      rol: TipoUsuario,
      input: CreateResenaInput
    ): Promise<ResenaOutput> {
      if (rol !== "cliente") {
        throw new AppError(
          403,
          "Solo los clientes pueden publicar reseñas."
        );
      }
      return repository.create(usuarioId, input);
    },
    // Consulta únicamente las reseñas positivas de un gimnasio.
    async listPublic(
      gymSlug: string,
      rol: TipoUsuario
    ): Promise<ResenaOutput[]> {
      if (!["cliente", "admin", "super_admin"].includes(rol)) {
        throw new AppError(403, "No tienes permisos para consultar reseñas.");
      }
      return repository.findPublicByGym(gymSlug);
    },
    // Consulta todas las reseñas de un gimnasio.
    // El gimnasio asignado debe venir de una fuente verificada del backend.
    async listForAdmin(
      gymSlug: string,
      rol: TipoUsuario,
      gymSlugAsignado: string | null
    ): Promise<ResenaOutput[]> {
      if (rol !== "admin") {
        throw new AppError(
          403,
          "Esta consulta está disponible para administradores de gimnasio."
        );
      }
      if (!gymSlugAsignado) {
        throw new AppError(
          403,
          "No tienes un gimnasio asignado. Solicita la configuración al equipo administrador."
        );
      }
      if (gymSlug !== gymSlugAsignado) {
        throw new AppError(
          403,
          "No tienes permiso para consultar las reseñas de este gimnasio."
        );
      }
      return repository.findAllByGym(gymSlugAsignado);
    },
    // El superadministrador puede consultar las reseñas de toda la plataforma.
    async listAll(
      rol: TipoUsuario
    ): Promise<ResenaOutput[]> {
      if (rol !== "super_admin") {
        throw new AppError(
          403,
          "Solo el superadministrador puede consultar todas las reseñas."
        );
      }
      return repository.findAll();
    },
  };
}
export type ResenasService = ReturnType<typeof createResenasService>;
export const resenasService = createResenasService();
