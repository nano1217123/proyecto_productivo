// Tipos de entrada y salida para los endpoints de reseñas.
// Datos limpios para crear una reseña (ya validados).
export interface CreateResenaInput {
  gymSlug: string;
  calificacion: number;
  comentario: string;
}
// Datos que se devuelven al consultar una reseña.
export interface ResenaOutput {
  id: string;
  gym_slug: string;
  calificacion: number;
  comentario: string | null;
  creado_en: string;
}
