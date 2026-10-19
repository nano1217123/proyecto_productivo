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
            imagenUrl: true,
            videoUrl: true, // 👈 AGREGADO
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
              imagen_url: string | null;
              video_url: string | null; // 👈 AGREGADO
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
            imagen_url: ej.imagenUrl,
            video_url: ej.videoUrl, // 👈 AGREGADO
          });
        }

        return Array.from(grupos.values());
      } catch (error) {
        console.error("Error al cargar ejercicios:", error);
        throw new AppError(500, "No se pudo cargar el catálogo de ejercicios.");
      }
    },

    async updateImagen(id: bigint, imagenUrl: string) {
      return await prisma.ejercicio.update({
        where: { id },
        data: { imagenUrl },
      });
    },

    // 👇 NUEVA FUNCIÓN AGREGADA 👇
    async updateVideo(id: bigint, videoUrl: string) {
      return await prisma.ejercicio.update({
        where: { id },
        data: { videoUrl },
      });
    },
  };
}

export type EjerciciosRepository = ReturnType<typeof createEjerciciosRepository>;
export const ejerciciosRepository = createEjerciciosRepository();