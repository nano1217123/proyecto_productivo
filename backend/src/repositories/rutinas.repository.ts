import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type {
  CreateRutinaInput,
  RutinaDetalle,
  RutinaResumen,
  UpdateRutinaInput,
} from "../types/rutinas.types.js";

// Acceso a la tabla "rutinas" y "rutina_ejercicios" con Prisma.
export function createRutinasRepository(db: typeof prisma = prisma) {
  return {
    // Lista las rutinas de un usuario con el conteo de ejercicios.
    async findAllByUsuario(usuarioId: string): Promise<RutinaResumen[]> {
      try {
        const rutinas = await db.rutina.findMany({
          where: { usuarioId },
          orderBy: { creadoEn: "desc" },
          select: {
            id: true,
            nombre: true,
            diaEtiqueta: true,
            _count: { select: { rutinaEjercicios: true } },
          },
        });

        return rutinas.map((r) => ({
          id: r.id,
          nombre: r.nombre,
          dia_etiqueta: r.diaEtiqueta,
          total_ejercicios: r._count.rutinaEjercicios,
        }));
      } catch (error) {
        console.error("Error al listar rutinas:", error);
        throw new AppError(500, "No se pudieron cargar tus rutinas.");
      }
    },

    // Devuelve una rutina con sus ejercicios ordenados, o null si no existe
    // o no pertenece al usuario.
    async findByIdForUsuario(
      rutinaId: string,
      usuarioId: string
    ): Promise<RutinaDetalle | null> {
      const rutina = await db.rutina.findFirst({
        where: { id: rutinaId, usuarioId },
        select: {
          id: true,
          nombre: true,
          diaEtiqueta: true,
          rutinaEjercicios: {
            orderBy: { orden: "asc" },
            select: {
              ejercicioId: true,
              orden: true,
              ejercicio: {
                select: { nombre: true, grupoNombre: true },
              },
            },
          },
        },
      });

      if (!rutina) return null;

      return {
        id: rutina.id,
        nombre: rutina.nombre,
        dia_etiqueta: rutina.diaEtiqueta,
        ejercicios: rutina.rutinaEjercicios.map((re) => ({
          ejercicio_id: Number(re.ejercicioId),
          orden: re.orden,
          nombre: re.ejercicio.nombre,
          grupo_nombre: re.ejercicio.grupoNombre,
        })),
      };
    },

    // Crea la rutina + sus ejercicios en una transacción.
    async create(
      usuarioId: string,
      input: CreateRutinaInput,
      generateId: () => string
    ): Promise<string> {
      try {
        const rutinaId = generateId();

        await db.$transaction([
          db.rutina.create({
            data: {
              id: rutinaId,
              usuarioId,
              nombre: input.nombre,
              diaEtiqueta: input.diaEtiqueta,
            },
          }),
          db.rutinaEjercicio.createMany({
            data: input.ejercicioIds.map((ejercicioId, idx) => ({
              rutinaId,
              ejercicioId: BigInt(ejercicioId),
              orden: idx + 1,
            })),
          }),
        ]);

        return rutinaId;
      } catch (error) {
        console.error("Error al crear rutina:", error);
        throw new AppError(500, "No se pudo crear la rutina.");
      }
    },

    // Actualiza nombre/etiqueta y reemplaza los ejercicios en transacción.
    async update(
      usuarioId: string,
      input: UpdateRutinaInput
    ): Promise<void> {
      try {
        // Verifica que la rutina existe y es del usuario.
        const existe = await db.rutina.findFirst({
          where: { id: input.rutinaId, usuarioId },
          select: { id: true },
        });

        if (!existe) {
          throw new AppError(404, "Rutina no encontrada.");
        }

        await db.$transaction([
          db.rutina.update({
            where: { id: input.rutinaId },
            data: {
              nombre: input.nombre,
              diaEtiqueta: input.diaEtiqueta,
            },
          }),
          db.rutinaEjercicio.deleteMany({
            where: { rutinaId: input.rutinaId },
          }),
          db.rutinaEjercicio.createMany({
            data: input.ejercicioIds.map((ejercicioId, idx) => ({
              rutinaId: input.rutinaId,
              ejercicioId: BigInt(ejercicioId),
              orden: idx + 1,
            })),
          }),
        ]);
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Error al actualizar rutina:", error);
        throw new AppError(500, "No se pudo actualizar la rutina.");
      }
    },

    // Borra la rutina (los rutina_ejercicios van en cascada).
    async delete(rutinaId: string, usuarioId: string): Promise<void> {
      try {
        const resultado = await db.rutina.deleteMany({
          where: { id: rutinaId, usuarioId },
        });

        if (resultado.count === 0) {
          throw new AppError(404, "Rutina no encontrada.");
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Error al borrar rutina:", error);
        throw new AppError(500, "No se pudo eliminar la rutina.");
      }
    },
  };
}

export type RutinasRepository = ReturnType<typeof createRutinasRepository>;

export const rutinasRepository = createRutinasRepository();