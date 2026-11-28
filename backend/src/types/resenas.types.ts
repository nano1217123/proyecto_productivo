// Tipos de entrada y salida para los endpoints de reseñas.
// Datos limpios para crear una reseña (ya validados).
export interface UpdateResenaInput {
  calificacion: number;
  comentario: string;
}
export interface CreateResenaInput extends UpdateResenaInput {
  gymSlug: string;
}
// Datos que se devuelven al consultar una reseña.
export interface ResenaOutput {
  id: string;
  gym_slug: string;
  calificacion: number;
  comentario: string | null;
  creado_en: string;
  respuesta?: RespuestaOficialOutput;
  estado_moderacion?: "VISIBLE" | "OCULTA";
}

export interface RespuestaOficialOutput {
  texto: string;
  creado_en: string;
  actualizado_en: string;
}

export interface EstadoVotoUtil {
  votos_utiles: number;
  mi_voto_util: boolean;
  puede_votar: boolean;
}

export type AccionRespuesta =
  | { tipo: "publicar" | "editar"; texto: string }
  | { tipo: "retirar" };

export const ordenesResenas = ["recientes", "antiguas", "mejor", "peor"] as const;

export interface ConsultaResenasPublicas {
  pagina: number;
  limite: number;
  orden: (typeof ordenesResenas)[number];
  calificacion?: number;
  buscar?: string;
}

export interface ConsultaResenasAdmin extends ConsultaResenasPublicas {
  estadoRespuesta?: "pendiente" | "respondida";
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
