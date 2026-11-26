import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { resenasService } from "../service/resenas.service.js";
import type { CreateResenaInput, ReporteResenasInput } from "../types/resenas.types.js";
// POST /api/resenas
// Publica una reseña para el usuario autenticado.
export const createResena: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado.");
  }
  if (!req.userRole) {
    throw new AppError(403, "No se pudo verificar tu rol.");
  }
  const resena = await resenasService.create(
    req.userId,
    req.userRole,
    req.body as CreateResenaInput
  );
  return res.status(201).json({ resena });
});
// GET /api/resenas/gimnasio/:gymSlug
// Devuelve únicamente las reseñas positivas.
export const listResenasPublicas: RequestHandler = asyncHandler(
  async (req, res) => {
    if (!req.userRole) {
      throw new AppError(403, "No se pudo verificar tu rol.");
    }
    const gymSlug = req.params.gymSlug;
    const resenas = await resenasService.listPublic(
      gymSlug,
      req.userRole
    );
    return res.status(200).json({ resenas });
  }
);

export const descargarReporteResenas: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  if (!req.userRole) throw new AppError(403, "No se pudo verificar tu rol.");
  const input = res.locals.reporteResenas as ReporteResenasInput;
  const csv = await resenasService.exportarCsv(req.userId, req.userRole, input);
  return res.status(200)
    .set("Cache-Control", "private, no-store")
    .set("X-Content-Type-Options", "nosniff")
    .attachment(`resenas-${input.gymSlug}.csv`)
    .type("text/csv; charset=utf-8")
    .send(csv);
});
// GET /api/resenas/todas
// Disponible exclusivamente para el superadministrador.
export const listTodasLasResenas: RequestHandler = asyncHandler(
  async (req, res) => {
    if (!req.userRole) {
      throw new AppError(403, "No se pudo verificar tu rol.");
    }
    const resenas = await resenasService.listAll(req.userRole);
    return res.status(200).json({ resenas });
  }
);
