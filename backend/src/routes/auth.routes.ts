import { Router } from "express";

import { createAdmin } from "../controller/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { validateCreateAdmin } from "../validator/auth.validator.js";

const router = Router();

// La autenticación y el registro de clientes se gestionan desde
// el frontend con Supabase Auth.
//
// Este backend solo permite crear administradores de gimnasio.
// La ruta requiere un usuario autenticado con rol super_admin
// o desarrollador.
//
// Orden: límite de intentos → token → rol → validación del body → controlador.
router.post(
  "/create-admin",
  authLimiter,
  requireAuth,
  requireRole("super_admin", "desarrollador"),
  validateCreateAdmin,
  createAdmin
);

export default router;