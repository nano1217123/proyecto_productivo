import { z } from "zod";
import { AppError } from "../errors/AppError.js";

export const idSesion = z.uuid();
export const revisionSesion = z.number().int().min(0).max(2147483646);
const texto = (max: number) => z.string().max(max).refine((value) => !value.includes("\u0000"), "El texto contiene un carácter inválido.");
const campos = {
  peso_kg: z.number().min(0).max(1500),
  repeticiones: z.number().int().min(1).max(999),
  duracion_seg: z.number().int().min(1).max(86400),
  distancia_km: z.number().min(0).max(1000),
  asistencia_kg: z.number().min(0).max(1500),
};
const formatos = {
  fuerza: ["peso_kg", "repeticiones"],
  corporal: ["repeticiones"],
  carga_adicional: ["peso_kg", "repeticiones"],
  asistido: ["asistencia_kg", "repeticiones"],
  isometrico: ["duracion_seg"],
  cardio: ["duracion_seg", "distancia_km"],
  movilidad: ["duracion_seg", "repeticiones"],
  estiramiento: ["duracion_seg"],
} as const;
const serie = z.object({
  peso_kg: campos.peso_kg.nullish(),
  repeticiones: campos.repeticiones.nullish(),
  duracion_seg: campos.duracion_seg.nullish(),
  distancia_km: campos.distancia_km.nullish(),
  asistencia_kg: campos.asistencia_kg.nullish(),
  completada: z.boolean(),
}).strict();

export const tipoRegistro = z.enum(["fuerza", "corporal", "carga_adicional", "asistido", "isometrico", "cardio", "movilidad", "estiramiento"]);

const objetivo = serie.omit({ completada: true }).extend({
  repeticiones_max: campos.repeticiones.nullish(),
}).strict();

const ejercicio = z.object({
  ejercicio_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  tipo: tipoRegistro,
  descanso: z.number().int().min(0).max(3600),
  notas: texto(200),
  series: z.array(serie).max(30),
  objetivo: objetivo.optional(),
}).strict().superRefine((value, ctx) => {
  const permitidos: readonly string[] = formatos[value.tipo];
  if (value.objetivo) {
    const { repeticiones, repeticiones_max, duracion_seg } = value.objetivo;
    const incompatible = Object.keys(campos).some((key) =>
      !permitidos.includes(key) && value.objetivo?.[key as keyof typeof campos] != null);
    if (incompatible || (repeticiones_max != null && (repeticiones == null || repeticiones_max < repeticiones))
      || (value.tipo === "movilidad" && repeticiones != null && duracion_seg != null)) {
      ctx.addIssue({ code: "custom", path: ["objetivo"], message: "Objetivo incompatible con el tipo de ejercicio." });
    }
  }
  value.series.forEach((s, i) => {
    const incompatible = Object.keys(campos).some((key) =>
      !permitidos.includes(key) && s[key as keyof typeof campos] != null);
    const completa = value.tipo === "movilidad"
      ? (s.duracion_seg != null) !== (s.repeticiones != null)
      : permitidos.every((key) => key === "distancia_km" || s[key as keyof typeof campos] != null);
    if (incompatible || (s.completada && !completa)) {
      ctx.addIssue({ code: "custom", path: ["series", i], message: "Medidas incompatibles o incompletas para este ejercicio." });
    }
  });
});

export const contenidoSesion = z.object({
  nombre: texto(100),
  notas: texto(200),
  ejercicios: z.array(ejercicio).max(30),
}).strict().refine(
  (value) => value.ejercicios.reduce((total, item) => total + item.series.length, 0) <= 200,
  "El entrenamiento admite hasta 200 series.",
);

export const inicioSesion = z.object({ id: idSesion, contenido: contenidoSesion }).strict();
export const cambioSesion = z.object({ revision: revisionSesion, contenido: contenidoSesion }).strict();
export type ContenidoSesion = z.infer<typeof contenidoSesion>;

export function leerSesion<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new AppError(400, `Registro inválido (${issue.path.join(".") || "sesión"}). ${issue.message}`);
  }
  return result.data;
}
