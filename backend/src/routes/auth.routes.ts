import { Router } from "express";
import { googleStart, googleCallback, microsoftStart, microsoftCallback } from "../controller/oauth.controller.js";
import {
  createAdmin,
  forgotPassword,     
  login,
  logout,
  refresh,
  register,
  resendCode,
  resetPassword,      
  verifyEmail,
} from "../controller/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  authLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  resendLimiter,
  verifyLimiter,
} from "../middleware/rateLimit.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import {
  validateCreateAdmin,
  validateForgotPassword,  
  validateLogin,
  validateRegister,
  validateResendCode,
  validateResetPassword,   
  validateVerifyEmail,
} from "../validator/auth.validator.js";

const router = Router();

// Orden: límite de intentos → token → rol → validación del body → controlador.
// Crear administradores requiere un usuario autenticado con rol super_admin.
// requireAuth valida el JWT de las cookies y requireRole consulta el rol
// actual en la BD en cada petición.
//
// Orden: límite de intentos → token → rol → validación del body → controlador.
router.post(
  "/create-admin",
  authLimiter,
  requireAuth,
  requireRole("super_admin"),
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

// Recuperación de contraseña (respuesta siempre genérica).
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateForgotPassword,
  forgotPassword
);
router.post("/reset-password", validateResetPassword, resetPassword);

// OAuth Google (Authorization Code + PKCE).
router.get("/oauth/google", googleStart);
router.get("/oauth/google/callback", googleCallback);

// OAuth Microsoft (Authorization Code + PKCE).
router.get("/oauth/microsoft", microsoftStart);
router.get("/oauth/microsoft/callback", microsoftCallback);

export default router;