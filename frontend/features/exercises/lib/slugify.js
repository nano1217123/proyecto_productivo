// Convierte un nombre de ejercicio a un slug estable para usarlo en la URL.
// Determinístico: el mismo nombre siempre produce el mismo slug, así que no
// hace falta guardar un campo "slug" adicional en muscleGroups.js.
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}