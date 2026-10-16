// Tipos de entrada y salida para los endpoints de rutinas.

// Datos limpios para crear una rutina (ya validados).
export interface CreateRutinaInput {
  nombre: string;
  diaEtiqueta: string | null;
  ejercicioIds: number[]; // bigint, pero JS los maneja como number
}

// Datos limpios para actualizar una rutina.
export interface UpdateRutinaInput {
  rutinaId: string;
  nombre: string;
  diaEtiqueta: string | null;
  ejercicioIds: number[];
}

// Item de la lista (vista resumida).
export interface RutinaResumen {
  id: string;
  nombre: string;
  dia_etiqueta: string | null;
  total_ejercicios: number;
}

// Detalle de una rutina (vista completa).
export interface RutinaDetalle {
  id: string;
  nombre: string;
  dia_etiqueta: string | null;
  ejercicios: {
    ejercicio_id: number;
    orden: number;
    nombre: string;
    grupo_nombre: string;
  }[];
}