import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "../lib/cookies.js";
import type { RequestHandler } from "express";
import { authService } from "../service/auth.service.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  // ... los que ya estaban
} from "../types/auth.types.js";
//import type { CreateAdminInput } from "../types/auth.types.js";
import type {
  CreateAdminInput,
  RegisterInput,
  ResendCodeInput,
  VerifyEmailInput,
  LoginInput
} from "../types/auth.types.js";

export const verifyEmail: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body as VerifyEmailInput);
  return res.status(200).json(result);
});

export const resendCode: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.resendCode(req.body as ResendCodeInput);
  return res.status(200).json(result);
});

export const createAdmin: RequestHandler = asyncHandler(async (req, res) => {
  // req.body ya pasó por validateCreateAdmin en la ruta.
  const result = await authService.createAdmin(req.body as CreateAdminInput);

  return res.status(201).json(result);
  
});

export const register: RequestHandler = asyncHandler(async (req, res) => {
  // req.body ya pasó por validateRegister en la ruta.
  const result = await authService.register(req.body as RegisterInput);

  return res.status(201).json(result);
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(
    req.body as LoginInput
  );

  // Los tokens viajan solo en cookies httpOnly; el body lleva datos públicos.
  setAuthCookies(res, accessToken, refreshToken);
  return res.status(200).json({ message: "Sesión iniciada.", user });
});

export const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  return res.status(200).json({ message: "Sesión renovada." });
});

export const logout: RequestHandler = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);

  clearAuthCookies(res);
  return res.status(200).json({ message: "Sesión cerrada." });
});

export const forgotPassword: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(
    req.body as ForgotPasswordInput
  );
  return res.status(200).json(result);
});

export const resetPassword: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(
    req.body as ResetPasswordInput
  );
  return res.status(200).json(result);
});