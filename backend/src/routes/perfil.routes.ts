import { Router } from "express";

import { getPerfil } from "../controller/perfil.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { perfilLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// GET /api/perfil
// Requiere estar autenticado. El limiter va después de requireAuth porque
// cuenta las peticiones por usuario, no por IP.
router.get("/", requireAuth, perfilLimiter, getPerfil);

export default router;