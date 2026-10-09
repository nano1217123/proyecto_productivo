import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import {
  authUsersRepository,
  type AuthUsersRepository,
} from "../repositories/authUsers.repository.js";
import { asyncHandler } from "./error.middleware.js";

const BEARER_PREFIX = "Bearer ";

// Exige un token válido de Supabase y deja el usuario en req.userId / req.userEmail.
export function createRequireAuth(
  repository: AuthUsersRepository = authUsersRepository
): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      throw new AppError(401, "No autorizado. Falta el token.");
    }

    const token = authHeader.slice(BEARER_PREFIX.length);
    const user = await repository.findByToken(token);

    if (!user) {
      throw new AppError(401, "Token inválido o expirado.");
    }

    req.userId = user.id;
    req.userEmail = user.email;
    next();
  });
}

export const requireAuth = createRequireAuth();