// Validaciones de entrada para el módulo de reseñas.
import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import {
  sanitizeString,
  containsSuspiciousPatterns,
} from "../lib/sanitize.js";
import type { CreateResenaInput } from "../types/resenas.types.js";
import { esSedeValida, SLUGS_SEDES } from "../lib/sedes.js";
// Gimnasios disponibles en la plataforma (catálogo central del backend).
const GIMNASIOS_VALIDOS = SLUGS_SEDES;
const COMENTARIO_MAX = 1000;
export function parseCreateResenaBody(
  body: unknown
): CreateResenaInput {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new AppError(400, "Los datos de la reseña no son válidos.");
  }
  const { gymSlug, calificacion, comentario } =
    body as Record<string, unknown>;
  if (
    typeof gymSlug !== "string" ||
    !GIMNASIOS_VALIDOS.includes(
      gymSlug as (typeof GIMNASIOS_VALIDOS)[number]
    )
  ) {
    throw new AppError(400, "El gimnasio seleccionado no es válido.");
  }
  const nota = Number(calificacion);
  if (
    !Number.isInteger(nota) ||
    nota < 1 ||
    nota > 5
  ) {
    throw new AppError(400, "La calificación debe ser un número entero entre 1 y 5.");
  }
  if (typeof comentario !== "string") {
    throw new AppError(400, "El comentario debe ser texto.");
  }
  if (containsSuspiciousPatterns(comentario)) {
    throw new AppError(400, "El comentario contiene contenido no permitido.");
  }
  const comentarioLimpio = sanitizeString(comentario);
  if (!comentarioLimpio) {
    throw new AppError(400, "Escribe un comentario antes de publicar.");
  }
  if (comentarioLimpio.length > COMENTARIO_MAX) {
    throw new AppError(
      400,
      `El comentario no puede superar los ${COMENTARIO_MAX} caracteres.`
    );
  }
  return {
    gymSlug,
    calificacion: nota,
    comentario: comentarioLimpio,
  };
}
export const validateCreateResena: RequestHandler = (
  req,
  _res,
  next
) => {
  req.body = parseCreateResenaBody(req.body);
  next();
};

const fechaReporte = z.iso.date().refine((fecha) => !fecha.startsWith("0000-"));
const filtrosReporte = z.strictObject({
  desde: fechaReporte.optional(),
  hasta: fechaReporte.optional(),
});

export const validateReporteResenas: RequestHandler = (req, res, next) => {
  const gymSlug = req.params.gymSlug;
  if (!esSedeValida(gymSlug)) throw new AppError(404, "Sede no encontrada.");

  const filtros = filtrosReporte.safeParse(req.query);
  if (!filtros.success) {
    throw new AppError(400, "Usa fechas válidas en formato YYYY-MM-DD para desde y hasta.");
  }
  const { desde, hasta } = filtros.data;
  if (desde && hasta && desde > hasta) {
    throw new AppError(400, "La fecha inicial debe ser anterior o igual a la fecha final.");
  }
  res.locals.reporteResenas = { gymSlug, desde, hasta };
  next();
};
