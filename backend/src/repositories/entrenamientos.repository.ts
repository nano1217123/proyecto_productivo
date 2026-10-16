import { prisma } from "../lib/prisma.js";
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
          where: { usuarioId },
          orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
          select: {
            id: true,
            fecha: true,
            notas: true,
            seriesEntrenamiento: {
              orderBy: { creadoEn: "asc" },
              select: {
                id: true,
                ejercicioId: true,
                numeroSerie: true,
                repeticiones: true,
                pesoKg: true,
                ejercicio: { select: { nombre: true } },
              },
            },
          },
        });

        return sesiones.map((s) => ({
          id: s.id,
          fecha: s.fecha.toISOString().slice(0, 10),
          notas: s.notas,
          series: s.seriesEntrenamiento.map((serie) => ({
            id: serie.id,
            ejercicio_id: Number(serie.ejercicioId),
            ejercicio_nombre: serie.ejercicio.nombre,
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
          },
          select: {
            pesoKg: true,
            entrenamiento: { select: { fecha: true } },
          },
        });

        const porFecha = new Map<string, number>();
        for (const s of series) {
          const fecha = s.entrenamiento.fecha.toISOString().slice(0, 10);
          const peso = s.pesoKg ? Number(s.pesoKg) : 0;
          const actual = porFecha.get(fecha) ?? 0;
          if (peso > actual) porFecha.set(fecha, peso);
        }

        return Array.from(porFecha.entries())
          .map(([fecha, peso_max]) => ({ fecha, peso_max }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha));
      } catch (error) {
        console.error("Error al cargar progreso:", error);
        throw new AppError(500, "No se pudo cargar el progreso del ejercicio.");
      }
    },

    // Borra un entrenamiento (las series van en cascada).
    async delete(entrenamientoId: string, usuarioId: string): Promise<void> {
      try {
        const resultado = await db.entrenamiento.deleteMany({
          where: { id: entrenamientoId, usuarioId },
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