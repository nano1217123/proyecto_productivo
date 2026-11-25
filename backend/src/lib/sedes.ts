// Catálogo de sedes de JJ GYM. Es la única lista válida en el backend:
// la usan las reseñas, la pertenencia de clientes (miembros_sede) y la
// administración de sedes (admin_sedes). El frontend la obtiene con
// GET /api/sedes en lugar de mantener su propia copia.
export const SEDES = [
  { slug: "jj-poblado", nombre: "JJ GYM El Poblado", ubicacion: "El Poblado, Medellín" },
  { slug: "power-laureles", nombre: "Power Laureles", ubicacion: "Laureles, Medellín" },
  { slug: "fit-belen", nombre: "Fit Lab Belén", ubicacion: "Belén, Medellín" },
] as const;

export type SlugSede = (typeof SEDES)[number]["slug"];

export const SLUGS_SEDES = SEDES.map((s) => s.slug) as readonly SlugSede[];

export function esSedeValida(valor: unknown): valor is SlugSede {
  return typeof valor === "string" && (SLUGS_SEDES as readonly string[]).includes(valor);
}
