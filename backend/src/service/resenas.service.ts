import { AppError } from "../errors/AppError.js";
import {
  resenasRepository,
  type ResenasRepository,
} from "../repositories/resenas.repository.js";
import type {
  CreateResenaInput,
  ReporteResenasInput,
  ResenaOutput,
} from "../types/resenas.types.js";
import type { TipoUsuario } from "../types/usuario.types.js";
import { gestionRepository } from "../repositories/gestion.repository.js";
import { generarCsvResenas } from "../lib/resenasCsv.js";

const MAX_FILAS_REPORTE = 5000;
const MAX_BYTES_REPORTE = 8 * 1024 * 1024;
const SIN_PERMISO_REPORTE = "No tienes permiso para descargar las reseñas de esta sede.";

// Sede registrada de un cliente (miembros_sede), o null.
type BuscarSedeCliente = (usuarioId: string) => Promise<string | null>;

export function createResenasService(
  repository: ResenasRepository = resenasRepository,
  buscarSedeCliente: BuscarSedeCliente = gestionRepository.findSedeDeCliente
) {
  return {
    async exportarCsv(usuarioId: string, rol: TipoUsuario, input: ReporteResenasInput) {
      if (rol !== "super_admin" &&
          (rol !== "admin" || !(await gestionRepository.administraSede(usuarioId, input.gymSlug)))) {
        throw new AppError(403, SIN_PERMISO_REPORTE);
      }

      const reporte = await repository.findForReport(
        input, rol === "admin" ? usuarioId : null, MAX_FILAS_REPORTE, MAX_BYTES_REPORTE
      );
      if (reporte.estado === "sin_permiso") throw new AppError(403, SIN_PERMISO_REPORTE);
      if (reporte.estado === "limite_filas") {
        throw new AppError(422, "El reporte supera las 5000 reseñas. Acota el rango de fechas.");
      }
      const csv = reporte.estado === "ok" ? generarCsvResenas(reporte.filas, MAX_BYTES_REPORTE) : null;
      if (csv === null) {
        throw new AppError(422, "El reporte supera los 8 MiB. Acota el rango de fechas.");
      }
      return csv;
    },
    // Permite que un cliente o un usuario particular publique una reseña.
    async create(
      usuarioId: string,
      rol: TipoUsuario,
      input: CreateResenaInput
    ): Promise<ResenaOutput> {
      if (rol !== "cliente" && rol !== "usuario_particular") {
        throw new AppError(
          403,
          "Solo los clientes pueden publicar reseñas."
        );
      }
      // El cliente solo reseña la sede a la que pertenece según el servidor.
      if (rol === "cliente") {
        const sede = await buscarSedeCliente(usuarioId);
        if (!sede) {
          throw new AppError(403, "Tu cuenta aún no tiene una sede asignada.");
        }
        if (input.gymSlug !== sede) {
          throw new AppError(403, "Solo puedes reseñar la sede a la que perteneces.");
        }
      }
      return repository.create(usuarioId, input);
    },
    // Consulta únicamente las reseñas positivas de un gimnasio.
    async listPublic(
      gymSlug: string,
      rol: TipoUsuario
    ): Promise<ResenaOutput[]> {
      if (!["cliente", "usuario_particular", "admin", "super_admin"].includes(rol)) {
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
