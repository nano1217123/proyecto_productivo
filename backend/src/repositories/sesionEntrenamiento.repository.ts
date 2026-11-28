import { isDeepStrictEqual } from "node:util";
import { AppError } from "../errors/AppError.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { generateId } from "../lib/uuid.js";
import { contenidoSesion, leerSesion, type ContenidoSesion } from "../validator/sesionEntrenamiento.validator.js";

const select = {
  id: true, estado: true, revision: true, iniciadoEn: true, finalizadoEn: true, sesion: true,
} as const;

export function createSesionEntrenamientoRepository(db = prisma) {
  function obtener(usuarioId: string, id: string) {
    return db.entrenamiento.findFirst({ where: { usuarioId, id }, select });
  }

  async function validarCatalogo(contenido: ContenidoSesion) {
    const ids = [...new Set(contenido.ejercicios.map((item) => BigInt(item.ejercicio_id)))];
    const count = await db.ejercicio.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new AppError(400, "Hay ejercicios que no están en el catálogo.");
  }

  return {
    activa(usuarioId: string) {
      return db.entrenamiento.findFirst({ where: { usuarioId, estado: "en_curso" }, select });
    },

    async iniciar(usuarioId: string, id: string, entrada: ContenidoSesion | (() => Promise<ContenidoSesion>)) {
      const existente = await obtener(usuarioId, id);
      if (existente) return existente;
      const contenido = typeof entrada === "function" ? await entrada() : entrada;
      await validarCatalogo(contenido);
      const ahora = new Date();
      const fecha = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(ahora);
      try {
        return await db.entrenamiento.create({
          data: { id, usuarioId, estado: "en_curso", iniciadoEn: ahora, fecha: new Date(fecha), sesion: contenido },
          select,
        });
      } catch (error) {
        if (typeof error !== "object" || !error || !("code" in error) || error.code !== "P2002") throw error;
        const repetida = await obtener(usuarioId, id);
        if (repetida) return repetida;
        throw new AppError(409, "Ya hay un entrenamiento en curso o el identificador no está disponible.");
      }
    },

    async guardar(usuarioId: string, id: string, revision: number, contenido: ContenidoSesion) {
      const actual = await obtener(usuarioId, id);
      if (!actual) throw new AppError(404, "Entrenamiento no encontrado.");
      if (actual.estado !== "en_curso") throw new AppError(409, "El entrenamiento ya terminó.");
      if (actual.revision === revision + 1 && isDeepStrictEqual(actual.sesion, contenido)) return actual;
      await validarCatalogo(contenido);
      const guardado = await db.entrenamiento.updateMany({
        where: { id, usuarioId, estado: "en_curso", revision },
        data: { revision: revision + 1, sesion: contenido },
      });
      if (!guardado.count) {
        const concurrente = await obtener(usuarioId, id);
        if (concurrente?.estado === "en_curso" && concurrente.revision === revision + 1 &&
          isDeepStrictEqual(concurrente.sesion, contenido)) return concurrente;
        throw new AppError(409, "El entrenamiento cambió en otra pestaña o dispositivo.");
      }
      return { ...actual, revision: revision + 1, sesion: contenido };
    },

    async cerrar(usuarioId: string, id: string, revision: number, estado: "finalizado" | "cancelado") {
      return db.$transaction(async (tx) => {
        const actual = await tx.entrenamiento.findFirst({ where: { id, usuarioId }, select });
        if (!actual) throw new AppError(404, "Entrenamiento no encontrado.");
        if (actual.estado === estado) return actual;
        if (actual.estado !== "en_curso" || actual.revision !== revision) {
          throw new AppError(409, "El entrenamiento cambió. Recupera la sesión antes de continuar.");
        }
        const finalizadoEn = new Date();
        const contenido = leerSesion(contenidoSesion, actual.sesion);
        const realizados = contenido.ejercicios
          .map((item) => ({ ...item, series: item.series.filter((s) => s.completada) }))
          .filter((item) => item.series.length);
        if (estado === "finalizado" && realizados.length === 0) {
          throw new AppError(400, "Completa al menos una serie para finalizar.");
        }
        const sesion = estado === "finalizado" ? {
          ...contenido, nombre: contenido.nombre.trim() || "Entrenamiento libre", ejercicios: realizados,
        } : null;
        const cierre = await tx.entrenamiento.updateMany({
          where: { id, usuarioId, estado: "en_curso", revision },
          data: { estado, finalizadoEn, nombre: sesion?.nombre, notas: sesion?.notas, sesion: sesion ?? Prisma.DbNull },
        });
        if (!cierre.count) {
          const concurrente = await tx.entrenamiento.findFirst({ where: { id, usuarioId }, select });
          if (concurrente?.estado === estado) return concurrente;
          throw new AppError(409, "El entrenamiento cambió durante el cierre.");
        }
        if (sesion) {
          await tx.serieEntrenamiento.createMany({
            data: realizados.flatMap((item) => item.series.map((s, index) => ({
              id: generateId(), usuarioId, entrenamientoId: id, ejercicioId: BigInt(item.ejercicio_id),
              tipo: item.tipo, numeroSerie: index + 1, pesoKg: s.peso_kg, repeticiones: s.repeticiones,
              duracionSeg: s.duracion_seg, distanciaKm: s.distancia_km, asistenciaKg: s.asistencia_kg,
            }))),
          });
        }
        return { ...actual, finalizadoEn, estado, sesion };
      });
    },
  };
}

export const sesionesEntrenamiento = createSesionEntrenamientoRepository();
