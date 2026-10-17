import { Router } from "express";
import { getMyRole, getValidRoles } from "../controller/rol.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { perfilLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// GET /api/rol/me
// Cualquier usuario autenticado puede consultar su propio rol.
router.get("/me", requireAuth, perfilLimiter, getMyRole);

// GET /api/rol/validos
// Solo super_admin: la lista de roles válidos es información administrativa.
router.get(
  "/validos",
  requireAuth,
  requireRole("super_admin"),
  perfilLimiter,
  getValidRoles
);

export default router;