import type { z } from "zod";
import type { tipoRegistro } from "../validator/sesionEntrenamiento.validator.js";

export interface PlanRutinaEjercicio {
  tipo?: z.infer<typeof tipoRegistro> | null;
  series?: number | null;
  repeticiones?: number | null;
  repeticionesMax?: number | null;
  pesoKg?: number | null;
  asistenciaKg?: number | null;
  duracionSeg?: number | null;
  distanciaKm?: number | null;
  notas?: string | null;
  descanso?: number | null;
}

export interface CreateRutinaInput {
  nombre: string;
  diaEtiqueta: string | null;
  descripcion?: string | null;
  objetivo?: string | null;
  notas?: string | null;
  dias?: number[];
  ejercicioIds: number[];
  planes?: (PlanRutinaEjercicio | null)[];
}

export interface UpdateRutinaInput extends CreateRutinaInput {
  rutinaId: string;
}
