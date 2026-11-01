import type { CookieOptions, RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { setAuthCookies } from "../lib/cookies.js";
import {
  buildAuthorizationUrl as buildGoogleUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getGoogleProfile,
} from "../lib/googleOAuth.js";
import {
  buildAuthorizationUrl as buildMicrosoftUrl,
  getMicrosoftProfile,
} from "../lib/microsoftOAuth.js";
import { oauthService } from "../service/oauth.service.js";

// Nombres de cookies separados por proveedor para no mezclar flujos si se abren en paralelo.
const GOOGLE_PKCE_COOKIE = "oauth_pkce_google";
const GOOGLE_STATE_COOKIE = "oauth_state_google";
const MS_PKCE_COOKIE = "oauth_pkce_ms";
const MS_STATE_COOKIE = "oauth_state_ms";

const FLOW_TTL_MS = 10 * 60 * 1000; // 10 min

const flowCookieBase: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax", // Necesario para que sobreviva el redirect de los proveedores
  maxAge: FLOW_TTL_MS,
};

// ==========================================
// GOOGLE
// ==========================================
export const googleStart: RequestHandler = (_req, res) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  res.cookie(GOOGLE_STATE_COOKIE, state, { ...flowCookieBase, path: "/" });
  res.cookie(GOOGLE_PKCE_COOKIE, codeVerifier, { ...flowCookieBase, path: "/" });

  const authUrl = buildGoogleUrl(state, codeChallenge);
  return res.redirect(authUrl);
};

export const googleCallback: RequestHandler = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  res.clearCookie(GOOGLE_STATE_COOKIE, { ...flowCookieBase, path: "/" });
  res.clearCookie(GOOGLE_PKCE_COOKIE, { ...flowCookieBase, path: "/" });

  if (error) return res.redirect(`${env.frontendUrl}/login?oauth=cancelled`);
  if (!code || !state) return res.redirect(`${env.frontendUrl}/login?oauth=invalid`);

  const stateGuardado = req.cookies?.[GOOGLE_STATE_COOKIE];
  const codeVerifier = req.cookies?.[GOOGLE_PKCE_COOKIE];

  if (!stateGuardado || stateGuardado !== state || !codeVerifier) {
    return res.redirect(`${env.frontendUrl}/login?oauth=invalid`);
  }

  try {
    const profile = await getGoogleProfile(code, codeVerifier);
    const result = await oauthService.loginWithProfile(profile);

    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.redirect(`${env.frontendUrl}/dashboard?oauth=ok`);
  } catch (err) {
    console.error("Error en callback de Google:", err);
    return res.redirect(`${env.frontendUrl}/login?oauth=error`);
  }
});

// ==========================================
// MICROSOFT
// ==========================================
export const microsoftStart: RequestHandler = (_req, res) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  res.cookie(MS_STATE_COOKIE, state, { ...flowCookieBase, path: "/" });
  res.cookie(MS_PKCE_COOKIE, codeVerifier, { ...flowCookieBase, path: "/" });

  const authUrl = buildMicrosoftUrl(state, codeChallenge);
  return res.redirect(authUrl);
};

export const microsoftCallback: RequestHandler = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  res.clearCookie(MS_STATE_COOKIE, { ...flowCookieBase, path: "/" });
  res.clearCookie(MS_PKCE_COOKIE, { ...flowCookieBase, path: "/" });

  if (error) return res.redirect(`${env.frontendUrl}/login?oauth=cancelled`);
  if (!code || !state) return res.redirect(`${env.frontendUrl}/login?oauth=invalid`);

  const stateGuardado = req.cookies?.[MS_STATE_COOKIE];
  const codeVerifier = req.cookies?.[MS_PKCE_COOKIE];

  if (!stateGuardado || stateGuardado !== state || !codeVerifier) {
    return res.redirect(`${env.frontendUrl}/login?oauth=invalid`);
  }

  try {
    const profile = await getMicrosoftProfile(code, codeVerifier);
    const result = await oauthService.loginWithProfile(profile);

    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.redirect(`${env.frontendUrl}/dashboard?oauth=ok`);
  } catch (err) {
    console.error("Error en callback de Microsoft:", err);
    return res.redirect(`${env.frontendUrl}/login?oauth=error`);
  }
});