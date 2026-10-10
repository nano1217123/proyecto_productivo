import { Router } from "express";

import { createAdmin, register } from "../controller/auth.controller.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimit.middleware.js";
import { validateCreateAdmin, validateRegister } from "../validator/auth.validator.js";import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";


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

// Registro público de clientes (Neon + Prisma, sin Supabase Auth).
// Orden: límite por IP → validación/sanitización → controlador.
router.post("/register", registerLimiter, validateRegister, register);
export default router;