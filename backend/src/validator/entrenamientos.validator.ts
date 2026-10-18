import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { sanitizeString, containsSuspiciousPatterns } from "../lib/sanitize.js";
import type {
  CreateEntrenamientoInput,
  SerieInput,
} from "../types/entrenamientos.types.js";

const LIMITES = {
  notasMax: 200,
  maxSeries: 100,
  maxRepeticiones: 999,
  maxPesoKg: 500,
} as const;

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseSerie(value: unknown, idx: number): SerieInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppError(400, `Serie ${idx + 1}: formato inválido.`);
  }

  const { ejercicio_id, numero_serie, repeticiones, peso_kg } = value as Record<string, unknown>;

  const ejId = Number(ejercicio_id);
  if (!Number.isInteger(ejId) || ejId <= 0) {
    throw new AppError(400, `Serie ${idx + 1}: ejercicio_id inválido.`);
  }

  const numSerie = Number(numero_serie);
  if (!Number.isInteger(numSerie) || numSerie <= 0) {
    throw new AppError(400, `Serie ${idx + 1}: numero_serie inválido.`);
  }

  const reps = Number(repeticiones);
  if (!Number.isInteger(reps) || reps <= 0 || reps > LIMITES.maxRepeticiones) {
    throw new AppError(
      400,
      `Serie ${idx + 1}: repeticiones debe estar entre 1 y ${LIMITES.maxRepeticiones}.`
    );
  }

  let peso: number | null = null;
  if (peso_kg !== undefined && peso_kg !== null && peso_kg !== "") {
    const p = Number(peso_kg);
    if (Number.isNaN(p) || p < 0 || p > LIMITES.maxPesoKg) {
      throw new AppError(
        400,
        `Serie ${idx + 1}: peso_kg debe estar entre 0 y ${LIMITES.maxPesoKg}.`
      );
    }
    peso = p;
  }

  return {
    ejercicio_id: ejId,
    numero_serie: numSerie,
    repeticiones: reps,
    peso_kg: peso,
  };
}

export function parseCreateEntrenamientoBody(body: unknown): CreateEntrenamientoInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(400, "Faltan campos requeridos: fecha, series.");
  }

  const { fecha, notas, series } = body as Record<string, unknown>;

  if (typeof fecha !== "string" || !FECHA_REGEX.test(fecha)) {
    throw new AppError(400, "La fecha debe tener formato YYYY-MM-DD.");
  }

  let notaLimpia: string | null = null;
  if (notas !== undefined && notas !== null && notas !== "") {
    if (typeof notas !== "string") {
      throw new AppError(400, "Las notas deben ser texto.");
    }
    if (containsSuspiciousPatterns(notas)) {
      throw new AppError(400, "Las notas contienen caracteres no permitidos.");
    }
    const limpio = sanitizeString(notas);
    if (limpio.length > LIMITES.notasMax) {
      throw new AppError(400, `Las notas no pueden superar los ${LIMITES.notasMax} caracteres.`);
    }
    notaLimpia = limpio || null;
  }

  if (!Array.isArray(series) || series.length === 0) {
    throw new AppError(400, "Agrega al menos una serie.");
  }

  if (series.length > LIMITES.maxSeries) {
    throw new AppError(400, `No puedes registrar más de ${LIMITES.maxSeries} series.`);
  }

  const seriesParsed = series.map((s, idx) => parseSerie(s, idx));

  return {
    fecha,
    notas: notaLimpia,
    series: seriesParsed,
  };
}

export const validateCreateEntrenamiento: RequestHandler = (req, _res, next) => {
  req.body = parseCreateEntrenamientoBody(req.body);
  next();
};