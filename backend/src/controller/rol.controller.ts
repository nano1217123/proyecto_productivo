import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { rolService } from "../service/rol.service.js";
import { ROLES_VALIDOS } from "../types/usuario.types.js";

// GET /api/rol/me
// requireAuth ya validó el token y dejó el id en req.userId.
// Devuelve el rol actual del usuario autenticado.
export const getMyRole: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado. Falta la sesión.");
  }

  const rol = await rolService.getRole(req.userId);

  return res.status(200).json({ rol });
});

// GET /api/rol/validos
// Solo super_admin (lo verifica requireRole en la ruta).
// Devuelve la lista de roles válidos del sistema.
export const getValidRoles: RequestHandler = asyncHandler(async (_req, res) => {
  return res.status(200).json({ roles: ROLES_VALIDOS });
});

