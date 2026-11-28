import { z } from "zod";
import { leerSesion, tipoRegistro } from "./sesionEntrenamiento.validator.js";
import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { sanitizeString, containsSuspiciousPatterns } from "../lib/sanitize.js";
import type {
  CreateRutinaInput,
  UpdateRutinaInput,
} from "../types/rutinas.types.js";

const texto = (max: number) => z.string().trim().max(max)
  .refine((value) => !value.includes("\u0000"), "El texto contiene un carácter inválido.")
  .transform((value) => value || null).nullish();

const planEjercicio = z.object({
  tipo: tipoRegistro.nullish(),
  series: z.number().int().min(1).max(30).nullish(),
  repeticiones: z.number().int().min(1).max(999).nullish(),
  descanso: z.number().int().min(0).max(3600).nullish(),
  repeticionesMax: z.number().int().min(1).max(999).nullish(),
  pesoKg: z.number().min(0).max(1500).nullish(),
  asistenciaKg: z.number().min(0).max(1500).nullish(),
  duracionSeg: z.number().int().min(1).max(86400).nullish(),
  distanciaKm: z.number().min(0).max(1000).nullish(),
  notas: texto(200),
}).strict().superRefine((plan, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: "custom", message });
  const { tipo, repeticiones, repeticionesMax, duracionSeg, pesoKg, asistenciaKg, distanciaKm } = plan;
  if (repeticionesMax != null && (repeticiones == null || repeticiones > repeticionesMax)) {
    reject("El máximo debe ser igual o superior a las repeticiones mínimas.");
  }
  if (!tipo) {
    if ([duracionSeg, pesoKg, asistenciaKg, distanciaKm].some((value) => value != null)) reject("Selecciona el tipo de ejercicio.");
    return;
  }
  // Las plantillas antiguas podían registrar únicamente series o descanso.
  // La edición actual envía siempre los objetivos aplicables.
  const porTiempo = ["isometrico", "cardio", "estiramiento"].includes(tipo);
  if ((porTiempo && repeticiones != null) ||
      (!porTiempo && tipo !== "movilidad" && duracionSeg != null) ||
      (tipo === "movilidad" && duracionSeg != null && repeticiones != null) ||
      (pesoKg != null && !["fuerza", "carga_adicional"].includes(tipo)) ||
      (asistenciaKg != null && tipo !== "asistido") ||
      (distanciaKm != null && tipo !== "cardio") ||
      (tipo === "cardio" && plan.series != null && plan.series !== 1)) {
    reject("La configuración contiene medidas incompatibles con el tipo de ejercicio.");
  }
});

const metadata = z.object({
  solicitudId: z.uuid().optional(),
  descripcion: texto(500),
  objetivo: texto(120),
  notas: texto(200),
  dias: z.array(z.number().int().min(1).max(7)).max(7)
    .refine((dias) => new Set(dias).size === dias.length, "Los días deben ser únicos.").optional(),
});

const LIMITES = {
  nombreMax: 60,
  etiquetaMax: 40,
  maxEjercicios: 50,
} as const;

// Convierte un valor a array de números positivos, o lanza AppError.
function parseEjercicioIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, "Agrega al menos un ejercicio a la rutina.");
  }

  if (value.length > LIMITES.maxEjercicios) {
    throw new AppError(
      400,
      `La rutina no puede tener más de ${LIMITES.maxEjercicios} ejercicios.`
    );
  }

  const ids = value.map((v) => {
    const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= 0) {
      throw new AppError(400, "Los IDs de ejercicio deben ser enteros positivos.");
    }
    return n;
  });

  return ids;
}

// Parsea y valida el body para crear una rutina.
export function parseCreateRutinaBody(body: unknown): CreateRutinaInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(400, "Faltan campos requeridos: nombre, ejercicioIds.");
  }

  const { nombre, diaEtiqueta, ejercicioIds, planes } = body as Record<string, unknown>;

  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new AppError(400, "La rutina necesita un nombre.");
  }

  if (containsSuspiciousPatterns(nombre)) {
    throw new AppError(400, "La solicitud contiene caracteres no permitidos.");
  }

  const nombreLimpio = sanitizeString(nombre);
  if (!nombreLimpio) throw new AppError(400, "La rutina necesita un nombre.");
  if (nombreLimpio.length > LIMITES.nombreMax) {
    throw new AppError(
      400,
      `El nombre no puede superar los ${LIMITES.nombreMax} caracteres.`
    );
  }

  let etiquetaLimpia: string | null = null;
  if (diaEtiqueta !== undefined && diaEtiqueta !== null && diaEtiqueta !== "") {
    if (typeof diaEtiqueta !== "string") {
      throw new AppError(400, "El día/etiqueta debe ser texto.");
    }
    const limpio = sanitizeString(diaEtiqueta);
    if (limpio.length > LIMITES.etiquetaMax) {
      throw new AppError(
        400,
        `La etiqueta no puede superar los ${LIMITES.etiquetaMax} caracteres.`
      );
    }
    etiquetaLimpia = limpio || null;
  }

  const ids = parseEjercicioIds(ejercicioIds);

  const datos = leerSesion(metadata, body);
  const configuracion = planes === undefined ? undefined
    : leerSesion(z.array(planEjercicio.nullable()).length(ids.length), planes);
  if (configuracion && configuracion.reduce((total, plan) => total + (plan?.series ?? 1), 0) > 200) {
    throw new AppError(400, "La rutina admite hasta 200 series.");
  }

  const actual = Object.hasOwn(body, "dias");
  if (actual && (ids.length > 30 || configuracion?.some((plan) => {
    if (!plan?.tipo) return true;
    if (plan.tipo !== "cardio" && plan.series == null) return true;
    if (plan.tipo === "movilidad") return plan.duracionSeg == null && plan.repeticiones == null;
    if (["cardio", "isometrico", "estiramiento"].includes(plan.tipo)) return plan.duracionSeg == null;
    return plan.repeticiones == null;
  }) || !configuracion)) {
    throw new AppError(400, "Configura las series y las repeticiones o duración de cada ejercicio. El máximo es de 30 ejercicios.");
  }

  return {
    ...datos,
    planes: configuracion,
    nombre: nombreLimpio,
    diaEtiqueta: etiquetaLimpia,
    ejercicioIds: ids,
  };
}

export const validateCreateRutina: RequestHandler = (req, _res, next) => {
  req.body = parseCreateRutinaBody(req.body);
  next();
};

// Parsea y valida el body para actualizar una rutina.
// Misma forma que create (nombre, diaEtiqueta, ejercicioIds).
export function parseUpdateRutinaBody(body: unknown): Omit<UpdateRutinaInput, "rutinaId"> {
  const { solicitudId: _solicitudId, ...input } = parseCreateRutinaBody(body);
  return input;
}

export const validateUpdateRutina: RequestHandler = (req, _res, next) => {
  req.body = parseUpdateRutinaBody(req.body);
  next();
};