import { AppError } from "../errors/AppError.js";
import type { MotivoDenunciaResena, MotivoModeracionResena, Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { esSedeValida } from "../lib/sedes.js";

const dias = (fecha: Date, cantidad: number) => new Date(fecha.getTime() + cantidad * 86_400_000);
type Accion = "DERIVAR" | "RESOLVER" | "OCULTAR" | "RESTAURAR";
type Decision = { accion: Accion; motivo: MotivoModeracionResena; revision: number | null };
type ResenaBloqueada = { id: string; gymSlug: string; revision: number; visibilidad: "VISIBLE" | "OCULTA" };
const resumenResena = { id: true, revision: true, visibilidad: true } as const;
const lecturaModerador = { ...resumenResena, gymSlug: true, calificacion: true, comentario: true } as const;
const resumenDenuncia = {
  id: true, gymSlug: true, motivo: true, estado: true, revision: true, prioritaria: true,
  creadoEn: true, revisarEn: true, resueltoEn: true,
} as const;
const resumenDecision = {
  accion: true, motivo: true, estado: true, anterior: true, posterior: true, creadoEn: true,
} as const;

async function leerRol(tx: Prisma.TransactionClient, actorId: string) {
  const [actor] = await tx.$queryRaw<{ rol: string }[]>`
    SELECT tipo_usuario AS rol FROM usuarios WHERE idusuario = ${actorId}::uuid FOR SHARE
  `;
  return actor?.rol;
}

async function asignada(tx: Prisma.TransactionClient, actorId: string, gymSlug: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM admin_sedes WHERE usuario_id = ${actorId}::uuid AND gym_slug = ${gymSlug} FOR SHARE
  `;
  return rows.length > 0;
}

export function createModeracionResenasRepository(db: typeof prisma = prisma, reloj = () => new Date()) {
  return {
    denunciar(actorId: string, id: string, motivo: MotivoDenunciaResena, descripcion?: string) {
      return db.$transaction(async tx => {
        const rol = await leerRol(tx, actorId);
        if (rol !== "cliente" && rol !== "usuario_particular") throw new AppError(403, "No puedes reportar reseñas.");
        const [resena] = await tx.$queryRaw<ResenaBloqueada[]>`
          SELECT id, gym_slug AS "gymSlug", revision, visibilidad FROM resenas
          WHERE id = ${id}::uuid AND visibilidad = 'VISIBLE' FOR SHARE
        `;
        if (!resena || !esSedeValida(resena.gymSlug)) throw new AppError(404, "Reseña no encontrada.");
        if (rol === "cliente") {
          const miembros = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM miembros_sede
            WHERE usuario_id = ${actorId}::uuid AND gym_slug = ${resena.gymSlug} FOR SHARE
          `;
          if (!miembros.length) throw new AppError(404, "Reseña no encontrada.");
        }
        const clave = JSON.stringify(["denuncia-resena", resena.id, actorId.toLowerCase()]);
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
        const ahora = reloj();
        const existente = await tx.denunciaResenaPrivada.findUnique({
          where: { resenaId_denuncianteId: { resenaId: resena.id, denuncianteId: actorId } },
          select: { denunciaId: true, vencerEn: true },
        });
        if (existente && existente.vencerEn > ahora) return { id: existente.denunciaId };
        if (existente) {
          await tx.denunciaResena.updateMany({
            where: { id: existente.denunciaId, estado: { not: "RESUELTA" } }, data: { prioritaria: true },
          });
          await tx.denunciaResenaPrivada.deleteMany({ where: { denunciaId: existente.denunciaId, vencerEn: { lte: ahora } } });
        }
        const revisarEn = dias(ahora, 30);
        return tx.denunciaResena.create({
          data: {
            resenaId: resena.id, gymSlug: resena.gymSlug, motivo, revision: resena.revision,
            creadoEn: ahora, revisarEn,
            datosPrivados: { create: {
              resenaId: resena.id, denuncianteId: actorId, descripcion, vencerEn: revisarEn,
            } },
          },
          select: { id: true },
        });
      });
    },
    listar(actorId: string, gymSlug: string | undefined, pagina: number, historial: boolean) {
      return db.$transaction(async tx => {
        const rol = await leerRol(tx, actorId);
        const global = rol === "super_admin";
        if (!global && (rol !== "admin" || !gymSlug || historial || !await asignada(tx, actorId, gymSlug))) {
          throw new AppError(403, "No tienes permiso para consultar esta cola.");
        }
        const ahora = reloj();
        const where: Prisma.DenunciaResenaWhereInput = {
          gymSlug, ...(historial ? { estado: "RESUELTA", eliminarEn: { gt: ahora } } : { estado: { not: "RESUELTA" } }),
        };
        const limite = 20;
        const casos = await tx.denunciaResena.findMany({
          where, take: limite + 1, skip: (pagina - 1) * limite,
          orderBy: [{ prioritaria: "desc" }, { revisarEn: "asc" }, { id: "asc" }],
          select: { ...resumenDenuncia, resena: { select: global && !historial ? lecturaModerador : resumenResena },
            decisiones: { orderBy: [{ creadoEn: "desc" }, { id: "desc" }], take: 10,
              select: global ? { ...resumenDecision, actorId: true } : resumenDecision },
          },
        });
        const visibles = casos.slice(0, limite);
        const detalles = global && !historial && visibles.length ? await tx.denunciaResenaPrivada.findMany({
          where: { denunciaId: { in: visibles.map(caso => caso.id) }, vencerEn: { gt: ahora } },
          select: { denunciaId: true, descripcion: true },
        }) : [];
        const porId = new Map(detalles.map(detalle => [detalle.denunciaId, detalle.descripcion]));
        return {
          casos: visibles.map(caso => ({
            ...caso, prioritaria: caso.estado !== "RESUELTA" && (caso.prioritaria || caso.revisarEn <= ahora),
            ...(porId.has(caso.id) ? { descripcion: porId.get(caso.id) } : {}),
          })),
          siguiente: casos.length > limite,
        };
      }, { isolationLevel: "RepeatableRead" });
    },
    listarOcultas(actorId: string, pagina: number) {
      return db.$transaction(async tx => {
        if (await leerRol(tx, actorId) !== "super_admin") throw new AppError(403, "No tienes permiso para consultar reseñas ocultas.");
        const filas = await tx.resena.findMany({
          where: { visibilidad: "OCULTA" }, orderBy: { id: "desc" }, take: 21, skip: (pagina - 1) * 20, select: lecturaModerador,
        });
        return { resenas: filas.slice(0, 20), siguiente: filas.length > 20 };
      });
    },
    listarDecisiones(actorId: string, gymSlug: string | undefined, pagina: number) {
      return db.$transaction(async tx => {
        if (await leerRol(tx, actorId) !== "super_admin") throw new AppError(403, "No tienes permiso para consultar decisiones.");
        const ahora = reloj();
        const filas = await tx.decisionModeracionResena.findMany({
          where: { gymSlug, OR: [
            { denuncia: { is: { estado: { not: "RESUELTA" } } } },
            { denuncia: { is: { eliminarEn: { gt: ahora } } } },
            { denunciaId: null, eliminarEn: { gt: ahora } },
          ] },
          orderBy: [{ creadoEn: "desc" }, { id: "desc" }], take: 21, skip: (pagina - 1) * 20,
          select: { ...resumenDecision, id: true, actorId: true, gymSlug: true, denunciaId: true },
        });
        return { decisiones: filas.slice(0, 20), siguiente: filas.length > 20 };
      });
    },
    decidir(actorId: string, destino: { denunciaId: string } | { resenaId: string }, decision: Decision) {
      return db.$transaction(async tx => {
        const rol = await leerRol(tx, actorId);
        if (rol !== "super_admin" && !(rol === "admin" && decision.accion === "DERIVAR")) {
          throw new AppError(403, "No tienes permiso para realizar esta acción.");
        }
        const denunciaId = "denunciaId" in destino ? destino.denunciaId : null;
        const original = denunciaId ? await tx.denunciaResena.findUnique({
          where: { id: denunciaId }, select: { resenaId: true, gymSlug: true },
        }) : null;
        if (denunciaId && !original) throw new AppError(404, "Denuncia no encontrada.");
        if (rol === "admin" && (!original || !await asignada(tx, actorId, original.gymSlug))) {
          throw new AppError(404, "Denuncia no encontrada.");
        }
        const id = "resenaId" in destino ? destino.resenaId : original?.resenaId;
        const [resena] = id ? await tx.$queryRaw<ResenaBloqueada[]>`
          SELECT id, gym_slug AS "gymSlug", revision, visibilidad FROM resenas WHERE id = ${id}::uuid FOR UPDATE
        ` : [];
        if (denunciaId) await tx.$queryRaw`SELECT id FROM denuncias_resenas WHERE id = ${denunciaId}::uuid FOR UPDATE`;
        const caso = denunciaId ? await tx.denunciaResena.findUnique({ where: { id: denunciaId }, select: resumenDenuncia }) : null;
        const ahora = reloj();
        if (denunciaId && (!caso || caso.estado === "RESUELTA")) throw new AppError(409, "La denuncia ya no está abierta.");
        if (decision.accion !== "DERIVAR" && decision.revision !== (resena?.revision ?? null)) {
          throw new AppError(409, "La reseña cambió. Vuelve a revisar el caso.");
        }
        if (decision.accion === "DERIVAR" && caso?.estado !== "PENDIENTE") throw new AppError(409, "La denuncia ya fue derivada.");
        const cambio = decision.accion === "OCULTAR" ? "OCULTA"
          : decision.accion === "RESTAURAR" ? "VISIBLE" : undefined;
        if (cambio && !resena) throw new AppError(404, "Reseña no encontrada.");
        if (cambio && cambio === resena?.visibilidad) throw new AppError(409, "La reseña ya tiene ese estado.");
        if (cambio && resena) {
          await tx.resena.update({ where: { id: resena.id }, data: { visibilidad: cambio, revision: { increment: 1 } } });
        }
        const estado = caso ? decision.accion === "DERIVAR" ? "DERIVADA" : "RESUELTA" : null;
        const eliminarEn = estado === "DERIVADA" ? null : dias(ahora, 180);
        if (caso && estado) {
          await tx.denunciaResena.update({
            where: { id: caso.id }, data: { estado, ...(eliminarEn ? { resueltoEn: ahora, eliminarEn } : {}) },
          });
          if (eliminarEn) await tx.denunciaResenaPrivada.deleteMany({ where: { denunciaId: caso.id } });
        }
        await tx.decisionModeracionResena.create({ data: {
          denunciaId: caso?.id, resenaId: resena?.id, actorId, gymSlug: caso?.gymSlug ?? resena!.gymSlug,
          accion: decision.accion, motivo: decision.motivo, estado, anterior: resena?.visibilidad,
          posterior: cambio ?? resena?.visibilidad, revision: resena?.revision, creadoEn: ahora, eliminarEn,
        } });
      }, { isolationLevel: "ReadCommitted" });
    },
    depurar(actorId?: string) {
      return db.$transaction(async tx => {
        if (actorId && await leerRol(tx, actorId) !== "super_admin") throw new AppError(403, "No tienes permiso para depurar.");
        const [control] = await tx.$queryRaw<{ adquirido: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtextextended('depurar-denuncias-resenas', 0)) AS adquirido
        `;
        if (!control?.adquirido) return { ejecutada: false, prioritarias: 0, datosPrivados: 0, casos: 0, decisiones: 0 };
        const ahora = reloj();
        const prioritarias = await tx.denunciaResena.updateMany({
          where: { estado: { not: "RESUELTA" }, prioritaria: false, revisarEn: { lte: ahora } },
          data: { prioritaria: true },
        });
        const datosPrivados = await tx.denunciaResenaPrivada.deleteMany({ where: { vencerEn: { lte: ahora } } });
        const casos = await tx.denunciaResena.deleteMany({ where: { estado: "RESUELTA", eliminarEn: { lte: ahora } } });
        const decisiones = await tx.decisionModeracionResena.deleteMany({
          where: { denunciaId: null, eliminarEn: { lte: ahora } },
        });
        return { ejecutada: true, prioritarias: prioritarias.count, datosPrivados: datosPrivados.count,
          casos: casos.count, decisiones: decisiones.count };
      }, { timeout: 30_000 });
    },
  };
}

export const moderacionResenasRepository = createModeracionResenasRepository();
