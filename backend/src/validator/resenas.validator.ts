// Validaciones de entrada para el módulo de reseñas.
import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import {
  sanitizeString,
  containsSuspiciousPatterns,
} from "../lib/sanitize.js";
import type { CreateResenaInput, UpdateResenaInput } from "../types/resenas.types.js";
import { ordenesResenas } from "../types/resenas.types.js";
import { esSedeValida } from "../lib/sedes.js";
const COMENTARIO_MAX = 1000;
const enteroQuery = z.string().regex(/^[1-9]\d*$/).transform(Number);
const consultaPublica = z.strictObject({
  pagina: enteroQuery.pipe(z.number().int().max(Number.MAX_SAFE_INTEGER)).default(1),
  limite: enteroQuery.pipe(z.number().int().max(50)).default(10),
  orden: z.enum(ordenesResenas).default("recientes"),
  calificacion: enteroQuery.pipe(z.number().int().max(5)).optional(),
  buscar: z.string().trim().max(120).refine(texto => !texto.includes("\0")).optional(),
});
const consultaAdmin = consultaPublica.extend({
  estadoRespuesta: z.enum(["pendiente", "respondida"]).optional(),
});

export function parseConsultaResenasAdmin(query: unknown) {
  const resultado = consultaAdmin.safeParse(query);
  if (!resultado.success) throw new AppError(400, "Los filtros de reseñas o la paginación no son válidos.");
  return resultado.data;
}

const respuestaOficial = z.strictObject({
  texto: z.string().trim().min(1).max(COMENTARIO_MAX).refine(texto => !texto.includes("\0") && !containsSuspiciousPatterns(texto))
    .transform(sanitizeString).pipe(z.string().min(1).max(COMENTARIO_MAX)),
});

export function parseRespuestaOficial(body: unknown) {
  const resultado = respuestaOficial.safeParse(body);
  if (!resultado.success) throw new AppError(400, "Escribe una respuesta válida de hasta 1000 caracteres.");
  return resultado.data.texto;
}

export function parseConsultaResenasPublicas(query: Record<string, unknown>) {
  if (!Object.keys(consultaPublica.shape).some(campo => Object.hasOwn(query, campo))) return undefined;
  const resultado = consultaPublica.safeParse(query);
  if (!resultado.success) throw new AppError(400, "Los filtros de reseñas o la paginación no son válidos.");
  return resultado.data;
}
function leerDatosResena(body: unknown): Record<string, unknown> {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new AppError(400, "Los datos de la reseña no son válidos.");
  }
  return body as Record<string, unknown>;
}

function validarContenido({ calificacion, comentario }: Record<string, unknown>): UpdateResenaInput {
  const nota = typeof calificacion === "number" || typeof calificacion === "string"
    ? Number(calificacion) : NaN;
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
    throw new AppError(400, "Escribe un comentario para la reseña.");
  }
  if (comentarioLimpio.length > COMENTARIO_MAX) {
    throw new AppError(
      400,
      `El comentario no puede superar los ${COMENTARIO_MAX} caracteres.`
    );
  }
  return {
    calificacion: nota,
    comentario: comentarioLimpio,
  };
}

export function parseCreateResenaBody(body: unknown): CreateResenaInput {
  const datos = leerDatosResena(body);
  if (!esSedeValida(datos.gymSlug)) {
    throw new AppError(400, "El gimnasio seleccionado no es válido.");
  }
  return { gymSlug: datos.gymSlug, ...validarContenido(datos) };
}

export const validateUpdateResena: RequestHandler = (req, _res, next) => {
  const datos = leerDatosResena(req.body);
  if (Object.keys(datos).some(campo => campo !== "calificacion" && campo !== "comentario")) {
    throw new AppError(400, "Solo puedes modificar la calificación y el comentario.");
  }
  req.body = validarContenido(datos);
  next();
};

const identificadorResena = z.guid();
export const validateResenaId: RequestHandler = (req, _res, next) => {
  if (!identificadorResena.safeParse(req.params.id).success) {
    throw new AppError(400, "El identificador de la reseña no es válido.");
  }
  next();
};
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

export function validateReporteResenas(alcance: "sede" | "consolidado"): RequestHandler {
  return (req, res, next) => {
    const gymSlug = req.params.gymSlug;
    if (alcance === "sede" && !esSedeValida(gymSlug)) throw new AppError(404, "Sede no encontrada.");

    const filtros = filtrosReporte.safeParse(req.query);
    if (!filtros.success) {
      throw new AppError(400, "Usa fechas válidas en formato YYYY-MM-DD para desde y hasta.");
    }
    const { desde, hasta } = filtros.data;
    if (desde && hasta && desde > hasta) {
      throw new AppError(400, "La fecha inicial debe ser anterior o igual a la fecha final.");
    }
    res.locals.reporteResenas = alcance === "sede" ? { alcance, gymSlug, desde, hasta } : { alcance, desde, hasta };
    next();
  };
}
