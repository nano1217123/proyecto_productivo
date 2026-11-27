import { AppError } from "../errors/AppError.js";
import {
  resenasRepository,
  type ResenasRepository,
} from "../repositories/resenas.repository.js";
import type {
  CreateResenaInput,
  FormatoReporteResenas,
  ReporteResenasInput,
  ResenaOutput,
} from "../types/resenas.types.js";
import type { TipoUsuario } from "../types/usuario.types.js";
import { gestionRepository } from "../repositories/gestion.repository.js";
import { generarCsvResenas, type FilaCsv } from "../lib/resenasCsv.js";
import { generarPdfResenas } from "../lib/resenasPdf.js";
import { esSedeValida, SEDES } from "../lib/sedes.js";

const MiB = 1024 * 1024;
const LIMITES = {
  csv: { filas: 5000, entrada: 8 * MiB, salida: 8 * MiB },
  pdf: { filas: 500, entrada: MiB, salida: 4 * MiB },
};
const SIN_PERMISO_REPORTE = "No tienes permiso para descargar las reseñas de esta sede.";

// Sede registrada de un cliente (miembros_sede), o null.
type BuscarSedeCliente = (usuarioId: string) => Promise<string | null>;

export function createResenasService(
  repository: ResenasRepository = resenasRepository,
  buscarSedeCliente: BuscarSedeCliente = gestionRepository.findSedeDeCliente
) {
  let pdfActivos = 0;
  return {
    async exportarReporte(
      usuarioId: string, rol: TipoUsuario, input: ReporteResenasInput, formato: FormatoReporteResenas,
    ) {
      if (input.alcance === "sede" && !esSedeValida(input.gymSlug)) {
        throw new AppError(404, "Sede no encontrada.");
      }
      if (rol !== "super_admin" && (input.alcance !== "sede" ||
          rol !== "admin" || !(await gestionRepository.administraSede(usuarioId, input.gymSlug)))) {
        throw new AppError(403, SIN_PERMISO_REPORTE);
      }

      if (formato === "pdf" && pdfActivos >= 2) {
        throw new AppError(429, "Hay demasiados PDF en preparación. Intenta de nuevo en un momento.");
      }
      if (formato === "pdf") pdfActivos++;
      try {
        const limite = LIMITES[formato];
        const reporte = await repository.findForReport(
          input, rol === "admin" ? usuarioId : null, limite.filas, limite.entrada
        );
        if (reporte.estado === "sin_permiso") throw new AppError(403, SIN_PERMISO_REPORTE);
        if (reporte.estado === "limite_filas") {
          throw new AppError(422, `El reporte supera las ${limite.filas} reseñas. Acota el rango de fechas.`);
        }
        const exceso = formato === "csv"
          ? "El reporte supera los 8 MiB. Acota el rango de fechas."
          : "El PDF supera el límite de tamaño o páginas. Acota el rango de fechas.";
        if (reporte.estado !== "ok") throw new AppError(422, exceso);

        const consolidado = input.alcance === "consolidado";
        const sedes = (consolidado ? [...SEDES].sort((a, b) => a.slug.localeCompare(b.slug, "en"))
          : SEDES.filter(s => s.slug === input.gymSlug));
        const secciones = sedes.map(s => ({
          slug: s.slug, nombre: s.nombre, filas: reporte.filas.filter(f => f.gym_slug === s.slug),
        }));
        const archivo = formato === "pdf"
          ? await generarPdfResenas(secciones, input, consolidado, limite.salida)
          : generarCsvResenas(consolidado ? secciones.flatMap<FilaCsv>(s => s.filas.length ? s.filas : [{
            gym_slug: s.slug, creado_en: null, calificacion: null, comentario: "0 reseñas" as const,
          }]) : reporte.filas, limite.salida);
        if (archivo === null) throw new AppError(422, exceso);
        return archivo;
      } finally {
        if (formato === "pdf") pdfActivos--;
      }
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
