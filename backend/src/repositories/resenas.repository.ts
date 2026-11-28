// Repositorio para las operaciones de base de datos del módulo de reseñas.
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import { SLUGS_SEDES } from "../lib/sedes.js";
import type {
  CreateResenaInput,
  FilaReporteResenas,
  ReporteResenasInput,
  ResenaOutput,
} from "../types/resenas.types.js";

type EstadoReporte = "ok" | "sin_permiso" | "limite_filas" | "limite_bytes";
type FilaConsultaReporte = { estado: EstadoReporte } & (
  | ({ fila_id: string } & FilaReporteResenas)
  | { fila_id: null; gym_slug: null; creado_en: null; calificacion: null; comentario: null }
);
// Convierte los datos de Prisma al formato de salida de la API.
function mapResena(resena: {
  id: string;
  gymSlug: string;
  calificacion: number;
  comentario: string | null; // ✅ Agregamos el | null
  creadoEn: Date;
}): ResenaOutput {
  return {
    id: resena.id,
    gym_slug: resena.gymSlug,
    calificacion: resena.calificacion,
    comentario: resena.comentario,
    creado_en: resena.creadoEn.toISOString(),
  };
}
export function createResenasRepository(db: typeof prisma = prisma) {
  return {
    async findForReport(
      input: ReporteResenasInput,
      adminId: string | null,
      maxFilas: number,
      maxBytes: number
    ) {
      const { desde, hasta } = input;
      const gymSlug = input.alcance === "sede" ? input.gymSlug : null;
      // La asignación y las filas se leen con la misma instantánea de PostgreSQL.
      // Los candidatos solo materializan IDs, fechas y tamaños.
      const resultado = await db.$queryRaw<FilaConsultaReporte[]>`
        WITH parametros AS (
          SELECT ${gymSlug}::text AS sede, ${adminId}::uuid AS admin_id,
                 ${desde ?? null}::date AS desde, ${hasta ?? null}::date AS hasta
        ), permiso AS (
          SELECT p.*, (p.admin_id IS NULL OR EXISTS (
            SELECT 1 FROM admin_sedes a
            WHERE a.usuario_id = p.admin_id AND a.gym_slug = p.sede
          )) AS autorizado
          FROM parametros p
        ), candidatas AS MATERIALIZED (
          SELECT r.id, r.gym_slug, r.creado_en, octet_length(r.comentario) AS bytes
          FROM resenas r CROSS JOIN permiso p
          WHERE p.autorizado AND (
            r.gym_slug = p.sede OR (p.sede IS NULL AND r.gym_slug = ANY(${[...SLUGS_SEDES]}::text[]))
          )
            AND r.calificacion BETWEEN 1 AND 5
            AND (p.desde IS NULL
              OR r.creado_en >= (p.desde::timestamp AT TIME ZONE 'America/Bogota'))
            AND (p.hasta IS NULL
              OR r.creado_en < ((p.hasta + 1)::timestamp AT TIME ZONE 'America/Bogota'))
          ORDER BY r.creado_en DESC, r.id DESC
          LIMIT ${maxFilas + 1}::integer
        ), resumen AS (
          SELECT count(*) AS cantidad, coalesce(sum(bytes), 0) AS bytes
          FROM candidatas
        ), estado AS (
          SELECT CASE
            WHEN NOT p.autorizado THEN 'sin_permiso'
            WHEN r.cantidad > ${maxFilas}::integer THEN 'limite_filas'
            WHEN r.bytes > ${maxBytes}::integer THEN 'limite_bytes'
            ELSE 'ok'
          END AS valor
          FROM permiso p CROSS JOIN resumen r
        ), elegibles AS MATERIALIZED (
          SELECT c.id, c.gym_slug, c.creado_en
          FROM candidatas c CROSS JOIN estado e
          WHERE e.valor = 'ok'
        )
        SELECT e.valor AS estado, c.id AS fila_id, r.gym_slug, r.creado_en, r.calificacion, r.comentario
        FROM estado e
        LEFT JOIN elegibles c ON true
        LEFT JOIN resenas r ON r.id = c.id
        ORDER BY c.gym_slug COLLATE "C", c.creado_en DESC, c.id DESC
      `;
      const estado = resultado[0]?.estado;
      if (!estado) throw new Error("La consulta del reporte no devolvió su estado.");
      if (estado !== "ok") return { estado };
      const filas = resultado.flatMap((fila) => fila.fila_id === null ? [] : [fila]);
      return { estado, filas } as const;
    },
    // Guarda una nueva reseña asociada al usuario autenticado.
    async create(
      usuarioId: string,
      input: CreateResenaInput
    ): Promise<ResenaOutput> {
      try {
        const resena = await db.resena.create({
          data: {
            usuarioId,
            gymSlug: input.gymSlug,
            calificacion: input.calificacion,
            comentario: input.comentario,
          },
          select: {
            id: true,
            gymSlug: true,
            calificacion: true,
            comentario: true,
            creadoEn: true,
          },
        });
        return mapResena(resena);
      } catch (error) {
        console.error("Error al crear reseña:", error);
        throw new AppError(500, "No se pudo guardar la reseña.");
      }
    },
    // Consulta las reseñas de la comunidad de un gimnasio.
    async findPublicByGym(gymSlug: string): Promise<ResenaOutput[]> {
      try {
        const resenas = await db.resena.findMany({
          where: { gymSlug },
          orderBy: { creadoEn: "desc" },
          select: {
            id: true,
            gymSlug: true,
            calificacion: true,
            comentario: true,
            creadoEn: true,
          },
        });
        return resenas.map(mapResena);
      } catch (error) {
        console.error("Error al consultar reseñas públicas:", error);
        throw new AppError(500, "No se pudieron consultar las reseñas.");
      }
    },
    // Consulta todas las reseñas de un gimnasio.
    // El servicio deberá comprobar que el administrador tenga acceso a esa sede.
    async findAllByGym(gymSlug: string): Promise<ResenaOutput[]> {
      try {
        const resenas = await db.resena.findMany({
          where: { gymSlug },
          orderBy: { creadoEn: "desc" },
          select: {
            id: true,
            gymSlug: true,
            calificacion: true,
            comentario: true,
            creadoEn: true,
          },
        });
        return resenas.map(mapResena);
      } catch (error) {
        console.error("Error al consultar reseñas del gimnasio:", error);
        throw new AppError(500, "No se pudieron consultar las reseñas del gimnasio.");
      }
    },
    // Consulta todas las reseñas de todos los gimnasios.
    // El servicio deberá reservar esta operación para el superadministrador.
    async findAll(): Promise<ResenaOutput[]> {
      try {
        const resenas = await db.resena.findMany({
          orderBy: { creadoEn: "desc" },
          select: {
            id: true,
            gymSlug: true,
            calificacion: true,
            comentario: true,
            creadoEn: true,
          },
        });
        return resenas.map(mapResena);
      } catch (error) {
        console.error("Error al consultar todas las reseñas:", error);
        throw new AppError(500, "No se pudieron consultar las reseñas.");
      }
    },
  };
}
export type ResenasRepository = ReturnType<typeof createResenasRepository>;
export const resenasRepository = createResenasRepository();
