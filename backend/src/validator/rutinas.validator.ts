import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { sanitizeString, containsSuspiciousPatterns } from "../lib/sanitize.js";
import type {
  CreateRutinaInput,
  UpdateRutinaInput,
} from "../types/rutinas.types.js";

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
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n <= 0) {
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

  const { nombre, diaEtiqueta, ejercicioIds } = body as Record<string, unknown>;

  if (typeof nombre !== "string" || !nombre.trim()) {
    throw new AppError(400, "La rutina necesita un nombre.");
  }

  if (containsSuspiciousPatterns(nombre)) {
    throw new AppError(400, "La solicitud contiene caracteres no permitidos.");
  }

  const nombreLimpio = sanitizeString(nombre);
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

  return {
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
  return parseCreateRutinaBody(body);
}

export const validateUpdateRutina: RequestHandler = (req, _res, next) => {
  req.body = parseUpdateRutinaBody(req.body);
  next();
};