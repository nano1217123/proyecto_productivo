// Tipos de entrada y salida para los endpoints de entrenamientos.

export interface SerieInput {
  ejercicio_id: number;
  numero_serie: number;
  repeticiones: number;
  peso_kg: number | null;
}

export interface CreateEntrenamientoInput {
  fecha: string; // "YYYY-MM-DD"
  notas: string | null;
  series: SerieInput[];
}

export interface SerieOutput {
  id: string;
  ejercicio_id: number;
  ejercicio_nombre: string;
  numero_serie: number;
  repeticiones: number;
  peso_kg: number | null;
}

export interface EntrenamientoResumen {
  id: string;
  fecha: string;
  notas: string | null;
  series: SerieOutput[];
}

export interface ProgresoPunto {
  fecha: string;
  peso_max: number;
}