import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../errors/AppError.js";
import type {
  CreateEntrenamientoInput,
  EntrenamientoResumen,
  ProgresoPunto,
} from "../types/entrenamientos.types.js";

export function createEntrenamientosRepository(db: typeof prisma = prisma) {
  return {
    // Historial completo del usuario, con series y nombre del ejercicio.
    async findAllByUsuario(usuarioId: string): Promise<EntrenamientoResumen[]> {
      try {
        const sesiones = await db.entrenamiento.findMany({
          where: { usuarioId, estado: "finalizado" },
          orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }, { id: "desc" }],
          select: {
            id: true,
            fecha: true,
            notas: true,
            nombre: true,
            iniciadoEn: true,
            finalizadoEn: true,
            sesion: true,
            seriesEntrenamiento: {
              orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
              select: {
                id: true,
                ejercicioId: true,
                numeroSerie: true,
                repeticiones: true,
                pesoKg: true,
                tipo: true, duracionSeg: true, distanciaKm: true, asistenciaKg: true,
                ejercicio: { select: { nombre: true, grupoNombre: true } },
              },
            },
          },
        });

        return sesiones.map((s) => ({
          id: s.id,
          fecha: s.fecha.toISOString().slice(0, 10),
          notas: s.notas,
          nombre: s.nombre,
          iniciadoEn: s.iniciadoEn,
          finalizadoEn: s.finalizadoEn,
          sesion: s.sesion,
          series: s.seriesEntrenamiento.map((serie) => ({
            id: serie.id,
            ejercicio_id: Number(serie.ejercicioId),
            ejercicio_nombre: serie.ejercicio.nombre,
            grupo: serie.ejercicio.grupoNombre,
            tipo: serie.tipo, duracion_seg: serie.duracionSeg,
            distancia_km: serie.distanciaKm === null ? null : Number(serie.distanciaKm),
            asistencia_kg: serie.asistenciaKg === null ? null : Number(serie.asistenciaKg),
            numero_serie: serie.numeroSerie,
            repeticiones: serie.repeticiones,
            peso_kg: serie.pesoKg ? Number(serie.pesoKg) : null,
          })),
        }));
      } catch (error) {
        console.error("Error al cargar historial:", error);
        throw new AppError(500, "No se pudo cargar el historial de entrenamientos.");
      }
    },

    // Crea la sesión + todas sus series en una transacción.
    async create(
      usuarioId: string,
      input: CreateEntrenamientoInput,
      generateId: () => string
    ): Promise<string> {
      const ejercicioIds = [...new Set(input.series.map((serie) => BigInt(serie.ejercicio_id)))];
      const catalogados = await db.ejercicio.count({ where: { id: { in: ejercicioIds } } });
      if (catalogados !== ejercicioIds.length) throw new AppError(400, "Hay ejercicios que no están en el catálogo.");
      const entrenamientoId = generateId();

      try {
        await db.$transaction([
          db.entrenamiento.create({
            data: {
              id: entrenamientoId,
              usuarioId,
              fecha: new Date(input.fecha + "T00:00:00.000Z"),
              notas: input.notas,
            },
          }),
          db.serieEntrenamiento.createMany({
            data: input.series.map((s) => ({
              id: generateId(),
              entrenamientoId,
              ejercicioId: BigInt(s.ejercicio_id),
              usuarioId,
              numeroSerie: s.numero_serie,
              repeticiones: s.repeticiones,
              pesoKg: s.peso_kg,
            })),
          }),
        ]);

        return entrenamientoId;
      } catch (error) {
        console.error("Error al crear entrenamiento:", error);
        throw new AppError(500, "No se pudo guardar el entrenamiento.");
      }
    },

    // Progreso por ejercicio: peso máximo por fecha.
    async getProgresoByEjercicio(
      usuarioId: string,
      ejercicioId: number
    ): Promise<ProgresoPunto[]> {
      try {
        const series = await db.serieEntrenamiento.findMany({
          where: {
            usuarioId,
            ejercicioId: BigInt(ejercicioId),
            pesoKg: { not: null },
            OR: [{ tipo: null }, { tipo: "fuerza" }],
            entrenamiento: { usuarioId, estado: "finalizado" },
          },
          select: {
            pesoKg: true,
            repeticiones: true,
            entrenamiento: { select: { fecha: true } },
          },
        });

        const porFecha = new Map<string, { peso_max: number; reps_max: number }>();
        for (const s of series) {
          const fecha = s.entrenamiento.fecha.toISOString().slice(0, 10);
          const peso = s.pesoKg ? Number(s.pesoKg) : 0;
          const actual = porFecha.get(fecha) ?? { peso_max: 0, reps_max: 0 };
          porFecha.set(fecha, {
            peso_max: Math.max(peso, actual.peso_max),
            reps_max: Math.max(s.repeticiones ?? 0, actual.reps_max),
          });
        }

        return Array.from(porFecha.entries())
          .map(([fecha, punto]) => ({ fecha, ...punto }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha));
      } catch (error) {
        console.error("Error al cargar progreso:", error);
        throw new AppError(500, "No se pudo cargar el progreso del ejercicio.");
      }
    },

    async corregir(id: string, usuarioId: string, nombre: string, notas: string): Promise<void> {
      const resultado = await db.$executeRaw(Prisma.sql`
        UPDATE "entrenamientos" SET "actualizado_en" = now(), "revision" = "revision" + 1, "nombre" = ${nombre}, "notas" = ${notas},
          "sesion" = CASE WHEN "sesion" IS NULL THEN NULL ELSE
            "sesion" || jsonb_build_object('nombre', ${nombre}::text, 'notas', ${notas}::text)
          END
        WHERE "id" = ${id}::uuid AND "usuario_id" = ${usuarioId}::uuid AND "estado" = 'finalizado'
      `);
      if (!resultado) throw new AppError(404, "Entrenamiento no encontrado.");
    },

    // Borra un entrenamiento (las series van en cascada).
    async delete(entrenamientoId: string, usuarioId: string): Promise<void> {
      try {
        const resultado = await db.entrenamiento.deleteMany({
          where: { id: entrenamientoId, usuarioId, estado: "finalizado" },
        });

        if (resultado.count === 0) {
          throw new AppError(404, "Entrenamiento no encontrado.");
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Error al borrar entrenamiento:", error);
        throw new AppError(500, "No se pudo eliminar el entrenamiento.");
      }
    },
  };
}

export type EntrenamientosRepository = ReturnType<typeof createEntrenamientosRepository>;
export const entrenamientosRepository = createEntrenamientosRepository();