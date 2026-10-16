import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";

export function createEjerciciosRepository(db: typeof prisma = prisma) {
  return {
    // Catálogo agrupado por grupo muscular.
    async findAllAgrupados() {
      try {
        const ejercicios = await db.ejercicio.findMany({
          orderBy: [{ grupoNombre: "asc" }, { nombre: "asc" }],
          select: {
            id: true,
            grupoSlug: true,
            grupoNombre: true,
            nombre: true,
            slug: true,
          },
        });

        const grupos = new Map<
          string,
          {
            slug: string;
            nombre: string;
            ejercicios: {
              id: number;
              grupo_slug: string;
              grupo_nombre: string;
              nombre: string;
              slug: string;
            }[];
          }
        >();

        for (const ej of ejercicios) {
          if (!grupos.has(ej.grupoSlug)) {
            grupos.set(ej.grupoSlug, {
              slug: ej.grupoSlug,
              nombre: ej.grupoNombre,
              ejercicios: [],
            });
          }
          grupos.get(ej.grupoSlug)!.ejercicios.push({
            id: Number(ej.id),
            grupo_slug: ej.grupoSlug,
            grupo_nombre: ej.grupoNombre,
            nombre: ej.nombre,
            slug: ej.slug,
          });
        }

        return Array.from(grupos.values());
      } catch (error) {
        console.error("Error al cargar ejercicios:", error);
        throw new AppError(500, "No se pudo cargar el catálogo de ejercicios.");
      }
    },
  };
}

export type EjerciciosRepository = ReturnType<typeof createEjerciciosRepository>;
export const ejerciciosRepository = createEjerciciosRepository();