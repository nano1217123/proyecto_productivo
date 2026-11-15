// Repositorio para las operaciones de base de datos del módulo de reseñas.
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type {
  CreateResenaInput,
  ResenaOutput,
} from "../types/resenas.types.js";
// Convierte los datos de Prisma al formato de salida de la API.
function mapResena(resena: {
  id: string;
  gymSlug: string;
  calificacion: number;
  comentario: string;
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
    // Consulta únicamente reseñas positivas para la vista de clientes.
    async findPublicByGym(gymSlug: string): Promise<ResenaOutput[]> {
      try {
        const resenas = await db.resena.findMany({
          where: {
            gymSlug,
            calificacion: { gte: 4 },
          },
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
