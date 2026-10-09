import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import {
  usuariosRepository,
  type UsuariosRepository,
} from "../repositories/usuarios.repository.js";
import type { TipoUsuario } from "../types/usuario.types.js";
import { asyncHandler } from "./error.middleware.js";

// Debe usarse SIEMPRE después de requireAuth (necesita req.userId).
// Consulta el rol actual en la base de datos en cada petición: no confía
// en nada que venga del cliente ni del token.
export function createRequireRole(
  repository: UsuariosRepository = usuariosRepository
) {
  return function requireRole(...allowedRoles: TipoUsuario[]): RequestHandler {
    return asyncHandler(async (req, _res, next) => {
      if (!req.userId) {
        throw new AppError(401, "No autorizado. Falta el token.");
      }

      const role = await repository.findRoleById(req.userId);

      if (!role) {
        throw new AppError(403, "No se pudo verificar tu rol.");
      }

      if (!allowedRoles.includes(role)) {
        throw new AppError(
          403,
          "No tienes permisos para realizar esta acción."
        );
      }

      req.userRole = role;
      next();
    });
  };
}

export const requireRole = createRequireRole();