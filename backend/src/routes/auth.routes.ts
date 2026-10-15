import { Router } from "express";

import {
  createAdmin,
  login,
  logout,
  refresh,
  register,
  resendCode,
  verifyEmail,
} from "../controller/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  authLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  resendLimiter,
  verifyLimiter,
} from "../middleware/rateLimit.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import {
  validateCreateAdmin,
  validateLogin,
  validateRegister,
  validateResendCode,
  validateVerifyEmail,
} from "../validator/auth.validator.js";

const router = Router();

// Registro público de clientes, verificación por OTP y sesión (login,
// refresh, logout): Neon + Prisma + JWT propio, sin Supabase Auth.
//
// Crear administradores requiere un usuario autenticado con rol
// super_admin o desarrollador. Por ahora requireAuth y requireRole siguen
// validando contra Supabase (pendiente de migrar a JWT propio).
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

// Registro público de clientes.
// Orden: límite por IP → validación/sanitización → controlador.
router.post("/register", registerLimiter, validateRegister, register);

// Verificación del correo con el código de 6 dígitos.
router.post("/verify-email", verifyLimiter, validateVerifyEmail, verifyEmail);

// Reenvío del código (respuesta siempre genérica).
router.post("/resend-code", resendLimiter, validateResendCode, resendCode);

// Sesión: login (cookies httpOnly), renovación rotativa y cierre.
router.post("/login", loginLimiter, validateLogin, login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", refreshLimiter, logout);

export default router;