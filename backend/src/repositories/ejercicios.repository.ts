import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";

export function createEjerciciosRepository(db: typeof prisma = prisma) {
  return {
    // Catálogo agrupado por grupo muscular.
    async findAllAgrupados(modoCasa: boolean = false) { // 👈 NUEVO: Acepta el parámetro
      try {
        // 👈 NUEVO: Lista de equipos permitidos para entrenar en casa
        const equiposCasa = [
          'Peso corporal',
          'Peso corporal o mancuerna',
          'Peso corporal o disco',
          'Peso corporal o tobillera con peso',
          'Peso corporal o barra de dominadas',
          'Dos bancos o sillas',
          'Banda de resistencia',
          'Mancuernas',
          'Mancuerna'
        ];

        const ejercicios = await db.ejercicio.findMany({
          where: modoCasa ? { equipo: { in: equiposCasa } } : {}, // 👈 NUEVO: El filtro
          orderBy: [{ grupoNombre: "asc" }, { nombre: "asc" }],
          select: {
            id: true,
            grupoSlug: true,
            grupoNombre: true,
            nombre: true,
            slug: true,
            equipo: true,
            musculoPrincipal: true,
            descripcion: true,
            consejo: true,
            imagenUrl: true,
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
              equipo?: string | null;
              musculo_principal?: string | null;
              descripcion?: string | null;
              consejo?: string | null;
              imagen_url: string | null;
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
            equipo: ej.equipo,
            musculo_principal: ej.musculoPrincipal,
            descripcion: ej.descripcion,
            consejo: ej.consejo,
            imagen_url: ej.imagenUrl,
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
  };
}

export type EjerciciosRepository = ReturnType<typeof createEjerciciosRepository>;
export const ejerciciosRepository = createEjerciciosRepository();