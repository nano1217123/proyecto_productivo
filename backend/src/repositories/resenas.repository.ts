// Repositorio para las operaciones de base de datos del módulo de reseñas.
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import { esSedeValida, SLUGS_SEDES } from "../lib/sedes.js";
import { resumirValoraciones } from "../lib/resenasEstadisticas.js";
import type { Prisma } from "../generated/prisma/client.js";
import type {
  AccionRespuesta,
  ConsultaResenasAdmin,
  CreateResenaInput,
  EstadoVotoUtil,
  FilaReporteResenas,
  ReporteResenasInput,
  ResenaOutput,
  UpdateResenaInput,
} from "../types/resenas.types.js";

const camposResena = { id: true, gymSlug: true, calificacion: true, comentario: true, creadoEn: true } as const;
const camposPropios = { ...camposResena, visibilidad: true } as const;
const camposRespuesta = { texto: true, creadoEn: true, actualizadoEn: true, eliminadoEn: true } as const;
const camposPublicos = { ...camposResena, respuesta: { select: camposRespuesta } } as const;
type Respuesta = Prisma.RespuestaResenaGetPayload<{ select: typeof camposRespuesta }>;

function mapRespuesta(respuesta: Respuesta) {
  return {
    texto: respuesta.texto,
    creado_en: respuesta.creadoEn.toISOString(),
    actualizado_en: respuesta.actualizadoEn.toISOString(),
  };
}
const ordenPublico = {
  recientes: [{ creadoEn: "desc" }, { id: "desc" }],
  antiguas: [{ creadoEn: "asc" }, { id: "asc" }],
  mejor: [{ calificacion: "desc" }, { creadoEn: "desc" }, { id: "desc" }],
  peor: [{ calificacion: "asc" }, { creadoEn: "desc" }, { id: "desc" }],
} satisfies Record<ConsultaResenasAdmin["orden"], Prisma.ResenaOrderByWithRelationInput[]>;

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
  comentario: string | null;
  creadoEn: Date;
  respuesta?: Respuesta | null;
  visibilidad?: "VISIBLE" | "OCULTA";
}): ResenaOutput {
  return {
    id: resena.id,
    gym_slug: resena.gymSlug,
    calificacion: resena.calificacion,
    comentario: resena.comentario,
    creado_en: resena.creadoEn.toISOString(),
    ...(resena.respuesta && !resena.respuesta.eliminadoEn ? { respuesta: mapRespuesta(resena.respuesta) } : {}),
    ...(resena.visibilidad ? { estado_moderacion: resena.visibilidad } : {}),
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
            AND r.visibilidad = 'VISIBLE' AND r.calificacion BETWEEN 1 AND 5
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
        const { gymSlug, calificacion, comentario } = input;
        const resena = await db.$transaction(async tx => {
          const clave = JSON.stringify(["resenas", usuarioId, gymSlug]);
          // La consulta siguiente toma una instantánea nueva tras adquirir el bloqueo.
          await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
          const existe = await tx.resena.findFirst({
            where: { usuarioId, gymSlug }, select: { id: true },
          });
          if (existe) throw new AppError(409, "Ya tienes una reseña para esta sede. Puedes gestionarla en Mis reseñas.");
          return tx.resena.create({
            data: { usuarioId, gymSlug, calificacion, comentario },
            select: camposResena,
          });
        }, { isolationLevel: "ReadCommitted" });
        return mapResena(resena);
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Error al crear reseña:", error);
        throw new AppError(500, "No se pudo guardar la reseña.");
      }
    },
    async findOwn(usuarioId: string): Promise<ResenaOutput[]> {
      const resenas = await db.resena.findMany({
        where: { usuarioId }, orderBy: [{ creadoEn: "desc" }, { id: "desc" }], select: camposPropios,
      });
      return resenas.map(mapResena);
    },
    async updateOwn(usuarioId: string, id: string, { calificacion, comentario }: UpdateResenaInput) {
      const [resena] = await db.resena.updateManyAndReturn({
        where: { id, usuarioId }, data: { calificacion, comentario, revision: { increment: 1 } }, select: camposPropios,
      });
      return resena ? mapResena(resena) : null;
    },
    async deleteOwn(usuarioId: string, id: string) {
      const { count } = await db.resena.deleteMany({ where: { id, usuarioId } });
      return count === 1;
    },
    async agregarEstadoVotos(resenas: ResenaOutput[], usuarioId: string) {
      if (!resenas.length) return [];
      const votos = await db.$queryRaw<({ id: string; cantidad: bigint; puede_denunciar: boolean } & Pick<EstadoVotoUtil, "mi_voto_util" | "puede_votar">)[]>`
        WITH parametros AS (
          SELECT ${[...SLUGS_SEDES]}::text[] AS sedes, ${usuarioId}::uuid AS usuario_id,
                 ${resenas.map(resena => resena.id)}::uuid[] AS ids
        ), totales AS (
          SELECT voto.resena_id, count(*) AS cantidad,
                 bool_or(voto.usuario_id = p.usuario_id) AS mi_voto_util
          FROM votos_utiles_resenas voto CROSS JOIN parametros p
          WHERE voto.resena_id = ANY(p.ids)
          GROUP BY voto.resena_id
        )
        SELECT r.id, coalesce(v.cantidad, 0) AS cantidad,
          coalesce(v.mi_voto_util, false) AS mi_voto_util,
          (r.usuario_id <> u.idusuario AND acceso.permitido) AS puede_votar,
          acceso.permitido AS puede_denunciar
        FROM parametros p JOIN resenas r ON r.id = ANY(p.ids)
        JOIN usuarios u ON u.idusuario = p.usuario_id
        LEFT JOIN miembros_sede m ON m.usuario_id = u.idusuario
        CROSS JOIN LATERAL (SELECT (r.visibilidad = 'VISIBLE' AND r.gym_slug = ANY(p.sedes) AND (
            u.tipo_usuario = 'usuario_particular' OR
            (u.tipo_usuario = 'cliente' AND coalesce(m.gym_slug = r.gym_slug, false))
          )) AS permitido) acceso
        LEFT JOIN totales v ON v.resena_id = r.id
      `;
      const porId = new Map(votos.map(voto => [voto.id, voto]));
      return resenas.map(resena => {
        const voto = porId.get(resena.id);
        return {
          ...resena, votos_utiles: Number(voto?.cantidad ?? 0),
          mi_voto_util: voto?.mi_voto_util ?? false, puede_votar: voto?.puede_votar ?? false,
          puede_denunciar: process.env.NODE_ENV !== "production" && (voto?.puede_denunciar ?? false),
        };
      });
    },
    async gestionarVotoUtil(usuarioId: string, resenaId: string, marcar: boolean): Promise<EstadoVotoUtil> {
      return db.$transaction(async tx => {
        const [usuario] = await tx.$queryRaw<{ id: string; rol: string }[]>`
          SELECT idusuario AS id, tipo_usuario AS rol FROM usuarios
          WHERE idusuario = ${usuarioId}::uuid FOR SHARE
        `;
        if (usuario?.rol !== "cliente" && usuario?.rol !== "usuario_particular") {
          throw new AppError(403, "No tienes permiso para votar reseñas.");
        }
        // Los votantes comparten este bloqueo. Una decisión de visibilidad debe esperar.
        const [resena] = await tx.$queryRaw<{ id: string; autor: string; sede: string }[]>`
          SELECT id, usuario_id AS autor, gym_slug AS sede FROM resenas
          WHERE id = ${resenaId}::uuid AND visibilidad = 'VISIBLE' FOR SHARE
        `;
        if (!resena || !esSedeValida(resena.sede)) throw new AppError(404, "Reseña no encontrada.");
        if (usuario.rol === "cliente") {
          const membresia = await tx.$queryRaw<{ gym_slug: string }[]>`
            SELECT gym_slug FROM miembros_sede
            WHERE usuario_id = ${usuario.id}::uuid AND gym_slug = ${resena.sede} FOR SHARE
          `;
          if (!membresia.length) throw new AppError(404, "Reseña no encontrada.");
        }
        if (resena.autor === usuario.id) throw new AppError(403, "No puedes votar tu propia reseña.");
        const clave = JSON.stringify(["voto-util-resena", usuario.id, resena.id]);
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
        const where = { resenaId: resena.id, usuarioId: usuario.id };
        if (marcar) await tx.votoUtilResena.createMany({ data: [where], skipDuplicates: true });
        else await tx.votoUtilResena.deleteMany({ where });
        const votos_utiles = await tx.votoUtilResena.count({ where: { resenaId: resena.id } });
        return { votos_utiles, mi_voto_util: marcar, puede_votar: true };
      }, { isolationLevel: "ReadCommitted" });
    },
    async gestionarRespuesta(usuarioId: string, resenaId: string, accion: AccionRespuesta) {
      return db.$transaction(async tx => {
        // Igual que los cambios de rol y sede, bloqueamos primero al usuario.
        const roles = await tx.$queryRaw<{ idusuario: string }[]>`
          SELECT idusuario FROM usuarios
          WHERE idusuario = ${usuarioId}::uuid AND tipo_usuario = 'admin'
          FOR SHARE
        `;
        if (!roles.length) throw new AppError(403, "No tienes permisos para responder reseñas.");
        // Bloquear la reseña serializa todas sus respuestas, incluso si aún no existe una.
        // El bloqueo de la asignación impide revocarla entre la comprobación y la escritura.
        const permisos = await tx.$queryRaw<{ id: string }[]>`
          SELECT r.id FROM resenas r
          JOIN admin_sedes a ON a.gym_slug = r.gym_slug AND a.usuario_id = ${usuarioId}::uuid
          WHERE r.id = ${resenaId}::uuid AND r.visibilidad = 'VISIBLE'
          FOR UPDATE OF r FOR SHARE OF a
        `;
        if (!permisos.length) throw new AppError(404, "Reseña no encontrada.");
        const anterior = await tx.respuestaResena.findUnique({ where: { resenaId }, select: { eliminadoEn: true } });
        const activa = anterior && !anterior.eliminadoEn;
        if (accion.tipo === "publicar" && activa) throw new AppError(409, "La reseña ya tiene una respuesta activa.");
        if (accion.tipo !== "publicar" && !activa) throw new AppError(404, "Respuesta activa no encontrada.");
        if (accion.tipo === "retirar") {
          await tx.respuestaResena.update({
            where: { resenaId },
            data: { eliminadoEn: new Date(), eliminadoPorId: usuarioId, actualizadoPorId: usuarioId },
          });
          return null;
        }
        const respuesta = anterior
          ? await tx.respuestaResena.update({
            where: { resenaId },
            data: { texto: accion.texto, actualizadoPorId: usuarioId, eliminadoEn: null, eliminadoPorId: null },
            select: camposRespuesta,
          })
          : await tx.respuestaResena.create({
            data: { resenaId, texto: accion.texto, creadoPorId: usuarioId, actualizadoPorId: usuarioId },
            select: camposRespuesta,
          });
        return mapRespuesta(respuesta);
      }, { isolationLevel: "ReadCommitted" });
    },
    async findPublicPage(gymSlug: string, consulta: ConsultaResenasAdmin, adminId?: string) {
      const { pagina, limite, orden, calificacion, buscar } = consulta;
      const estadoRespuesta = adminId ? consulta.estadoRespuesta : undefined;
      const sede = { gymSlug, visibilidad: "VISIBLE" as const, calificacion: { gte: 1, lte: 5 } };
      const where: Prisma.ResenaWhereInput = {
        ...sede,
        ...(calificacion === undefined ? {} : { calificacion }),
        ...(buscar ? { comentario: { contains: buscar.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } } : {}),
        ...(estadoRespuesta === "pendiente" ? { OR: [
          { respuesta: { is: null } }, { respuesta: { is: { eliminadoEn: { not: null } } } },
        ] }
          : estadoRespuesta === "respondida" ? { respuesta: { is: { eliminadoEn: null } } } : {}),
      };
      return db.$transaction(async tx => {
        if (adminId) {
          const asignacion = await tx.adminSede.findFirst({
            where: { usuarioId: adminId, gymSlug, usuario: { tipoUsuario: "admin" } }, select: { id: true },
          });
          if (!asignacion) throw new AppError(403, "No tienes permiso para gestionar reseñas de esta sede.");
        }
        const grupos = await tx.resena.groupBy({ by: ["calificacion"], where: sede, _count: { _all: true } });
        const estadisticas = resumirValoraciones(new Map(grupos.map(grupo => [grupo.calificacion, grupo._count._all])));
        const total = calificacion === undefined && !buscar && !estadoRespuesta ? estadisticas.total : await tx.resena.count({ where });
        const paginas = Math.ceil(total / limite);
        const actual = Math.min(pagina, Math.max(1, paginas));
        const filas = total === 0 ? [] : await tx.resena.findMany({
          where, orderBy: ordenPublico[orden], skip: (actual - 1) * limite, take: limite, select: camposPublicos,
        });
        return {
          resenas: filas.map(mapResena),
          estadisticas,
          paginacion: { pagina: actual, limite, total, paginas },
        };
      }, { isolationLevel: "RepeatableRead" });
    },
    // Consulta las reseñas de la comunidad de un gimnasio.
    async findPublicByGym(gymSlug: string): Promise<ResenaOutput[]> {
      try {
        const resenas = await db.resena.findMany({
          where: { gymSlug, visibilidad: "VISIBLE" },
          orderBy: { creadoEn: "desc" },
          select: camposPublicos,
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
          where: { gymSlug, visibilidad: "VISIBLE" },
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
          where: { visibilidad: "VISIBLE" },
          orderBy: { creadoEn: "desc" },
          select: camposPublicos,
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
