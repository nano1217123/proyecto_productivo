import { Router } from "express";
import { googleStart, googleCallback } from "../controller/oauth.controller.js";
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

router.post(
  "/create-admin",
  authLimiter,
  requireAuth,
  requireRole("super_admin"),
  validateCreateAdmin,
  createAdmin
);

router.post("/register", registerLimiter, validateRegister, register);
router.post("/verify-email", verifyLimiter, validateVerifyEmail, verifyEmail);
router.post("/resend-code", resendLimiter, validateResendCode, resendCode);
router.post("/login", loginLimiter, validateLogin, login);
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