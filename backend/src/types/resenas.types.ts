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

export interface FiltrosReporteResenas {
  desde?: string;
  hasta?: string;
}

export type ReporteResenasInput = FiltrosReporteResenas & (
  { alcance: "sede"; gymSlug: string } | { alcance: "consolidado" }
);
export type FormatoReporteResenas = "csv" | "pdf";

export interface FilaReporteResenas {
  gym_slug: string;
  creado_en: Date;
  calificacion: number;
  comentario: string | null;
}

export interface SeccionReporteResenas {
  slug: string;
  nombre: string;
  filas: FilaReporteResenas[];
}
