import { Router } from "express";
import { googleStart, googleCallback } from "../controller/oauth.controller.js";
import {
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
import { verifyRecaptcha } from "../middleware/recaptcha.middleware.js";
import { gestionController } from "../controller/gestion.controller.js";
import { validateAsignarAdmin } from "../validator/gestion.validator.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import {
  validateForgotPassword,  
  validateLogin,
  validateRegister,
  validateResendCode,
  validateResetPassword,   
  validateVerifyEmail,
} from "../validator/auth.validator.js";

const router = Router();

// Asigna el rol admin y sus sedes a una cuenta existente y verificada
// (confirmada por id y correo), en una transacción auditada. No crea
// cuentas ni modifica cuentas super_admin.
router.post(
  "/create-admin",
  authLimiter,
  requireAuth,
  requireRole("super_admin"),
  validateAsignarAdmin,
  gestionController.asignarAdmin
);

router.post(
  "/register",
  registerLimiter,
  validateRegister,
  verifyRecaptcha("register"),
  register
);
router.post("/verify-email", verifyLimiter, validateVerifyEmail, verifyEmail);
router.post("/resend-code", resendLimiter, validateResendCode, resendCode);
router.post("/login", loginLimiter, validateLogin, verifyRecaptcha("login"), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", refreshLimiter, logout);
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateForgotPassword,
  forgotPassword
);
router.post("/reset-password", validateResetPassword, resetPassword);

router.get("/oauth/google", googleStart);
router.get("/oauth/google/callback", googleCallback);

export default router;