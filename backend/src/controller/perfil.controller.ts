import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { perfilService } from "../service/perfil.service.js";

// GET /api/perfil
// requireAuth ya validó el token y dejó el id en req.userId.
export const getPerfil: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado. Falta el token.");
  }

  const profile = await perfilService.getProfileById(req.userId);

  return res.status(200).json({ profile });
});