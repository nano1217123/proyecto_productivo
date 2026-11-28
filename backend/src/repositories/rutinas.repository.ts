import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import { Prisma } from "../generated/prisma/client.js";
import type { CreateRutinaInput, UpdateRutinaInput } from "../types/rutinas.types.js";

const include = {
  rutinaEjercicios: {
    orderBy: { orden: "asc" },
    include: { ejercicio: { select: { nombre: true, grupoNombre: true, equipo: true, imagenUrl: true, videoUrl: true, musculoPrincipal: true } } },
  },
} as const;

function presentar(rutina: Prisma.RutinaGetPayload<{ include: typeof include }>) {
  const { id, nombre, diaEtiqueta, descripcion, objetivo, notas, dias, archivada, creadoEn, actualizadoEn } = rutina;
  return {
    id, nombre, dia_etiqueta: diaEtiqueta, descripcion, objetivo, notas, dias, archivada,
    actualizadoEn: actualizadoEn ?? creadoEn,
    total_ejercicios: rutina.rutinaEjercicios.length,
    ejercicios: rutina.rutinaEjercicios.map(({ ejercicio, ejercicioId, orden, tipo, series, repeticiones,
      repeticionesMax, descanso, pesoKg, asistenciaKg, duracionSeg, distanciaKm, notas }) => ({
      ejercicio_id: Number(ejercicioId), orden, nombre: ejercicio.nombre, grupo_nombre: ejercicio.grupoNombre,
      equipo: ejercicio.equipo, imagen_url: ejercicio.imagenUrl, video_url: ejercicio.videoUrl,
      musculo_principal: ejercicio.musculoPrincipal,
      plan: { tipo, series, repeticiones, repeticionesMax, descanso, pesoKg, asistenciaKg, duracionSeg, distanciaKm, notas },
    })),
  };
}

export function createRutinasRepository(db = prisma) {
  async function validarCatalogo(tx: Prisma.TransactionClient, ids: number[]) {
    const unicos = [...new Set(ids)].map(BigInt);
    if (await tx.ejercicio.count({ where: { id: { in: unicos } } }) !== unicos.length) {
      throw new AppError(400, "Hay ejercicios que no están en el catálogo.");
    }
  }

  return {
    async findAllByUsuario(usuarioId: string, archivada = false) {
      const rutinas = await db.rutina.findMany({ where: { usuarioId, archivada }, orderBy: { creadoEn: "desc" }, include });
      return rutinas.map(presentar);
    },

    async findByIdForUsuario(id: string, usuarioId: string) {
      const rutina = await db.rutina.findFirst({ where: { id, usuarioId }, include });
      return rutina ? presentar(rutina) : null;
    },

    async create(usuarioId: string, input: CreateRutinaInput, generateId: () => string) {
      const { ejercicioIds, planes, solicitudId, ...datos } = input;
      const id = solicitudId ?? generateId();
      const existe = () => db.rutina.findFirst({ where: { id, usuarioId }, select: { id: true } });
      if (solicitudId && await existe()) return id;
      try {
        await db.$transaction(async (tx) => {
          await validarCatalogo(tx, ejercicioIds);
          await tx.rutina.create({
            data: { ...datos, id, usuarioId, rutinaEjercicios: { createMany: { data: ejercicioIds.map((ejercicioId, i) => ({
              ejercicioId: BigInt(ejercicioId), orden: i + 1, ...planes?.[i],
            })) } } },
          });
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        if (!solicitudId || !(await existe())) throw new AppError(409, "El identificador de solicitud no está disponible.");
      }
      return id;
    },

    async update(usuarioId: string, input: UpdateRutinaInput) {
      const { rutinaId, ejercicioIds, planes, solicitudId: _solicitudId, ...datos } = input;
      await db.$transaction(async (tx) => {
        const resultado = await tx.rutina.updateMany({ where: { id: rutinaId, usuarioId }, data: datos });
        if (!resultado.count) throw new AppError(404, "Rutina no encontrada.");
        await validarCatalogo(tx, ejercicioIds);
        const anteriores = new Map<bigint, Prisma.RutinaEjercicioCreateManyInput[]>();
        if (!planes) {
          const filas = await tx.rutinaEjercicio.findMany({ where: { rutinaId }, orderBy: { orden: "asc" } });
          for (const { id: _id, creadoEn: _creadoEn, ...fila } of filas) {
            const lista = anteriores.get(fila.ejercicioId) ?? [];
            lista.push(fila);
            anteriores.set(fila.ejercicioId, lista);
          }
        }
        await tx.rutinaEjercicio.deleteMany({ where: { rutinaId } });
        await tx.rutinaEjercicio.createMany({
          data: ejercicioIds.map((id, i) => ({
            ...(planes ? planes[i] : anteriores.get(BigInt(id))?.shift()),
            rutinaId, ejercicioId: BigInt(id), orden: i + 1,
          })),
        });
      });
    },

    async setArchived(id: string, usuarioId: string, archivada: boolean) {
      const resultado = await db.rutina.updateMany({
        where: { id, usuarioId }, data: { archivada },
      });
      if (!resultado.count) throw new AppError(404, "Rutina no encontrada.");
    },

    async delete(id: string, usuarioId: string) {
      const resultado = await db.rutina.deleteMany({ where: { id, usuarioId } });
      if (!resultado.count) throw new AppError(404, "Rutina no encontrada.");
    },
  };
}

export type RutinasRepository = ReturnType<typeof createRutinasRepository>;
export const rutinasRepository = createRutinasRepository();
