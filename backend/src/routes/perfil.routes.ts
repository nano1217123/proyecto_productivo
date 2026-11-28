import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { consultarAltura, guardarAltura } from "../repositories/progresoCorporal.repository.js";
import { Router } from "express";

import { getPerfil } from "../controller/perfil.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { perfilLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// GET /api/perfil
// Requiere estar autenticado. El limiter va después de requireAuth porque
// cuenta las peticiones por usuario, no por IP.
router.get("/", requireAuth, perfilLimiter, getPerfil);

const personal = requireRole("cliente", "usuario_particular");

router.get("/altura", requireAuth, personal, asyncHandler(async (req, res) => {
  res.set("Cache-Control", "private, no-store").json(await consultarAltura(req.userId!));
}));

router.patch("/altura", requireAuth, personal, asyncHandler(async (req, res) => {
  if (req.get("Sec-Fetch-Site") === "cross-site") throw new AppError(403, "Solicitud no autorizada.");
  if (!req.is("application/json")) throw new AppError(415, "Envía los datos en formato JSON.");
  const result = z.strictObject({ alturaCm: z.number().int().positive().max(300) }).safeParse(req.body);
  if (!result.success) throw new AppError(400, "Indica una altura válida en centímetros enteros.");
  res.set("Cache-Control", "private, no-store").json(await guardarAltura(req.userId!, result.data.alturaCm));
}));

export default router;