import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "./error.middleware.js";
import { ACCESS_COOKIE } from "../lib/cookies.js";
import { verifyAccessToken } from "../lib/tokens.js";

// Exige un access token JWT válido.
// El token se lee SOLO de la cookie httpOnly (no de Authorization header)
// para evitar XSS.
// Deja el usuario en req.userId y req.userEmail.
export const requireAuth: RequestHandler = asyncHandler(
  async (req, _res, next) => {
    const token = req.cookies?.[ACCESS_COOKIE];

    if (!token) {
      throw new AppError(401, "No autorizado. Falta la sesión.");
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      throw new AppError(401, "Sesión inválida o expirada.");
    }

    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  }
);