import type { CookieOptions, RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { setAuthCookies } from "../lib/cookies.js";
import {
  buildAuthorizationUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getGoogleProfile,
} from "../lib/googleOAuth.js";
import { oauthService } from "../service/oauth.service.js";

const PKCE_COOKIE = "oauth_pkce";
const STATE_COOKIE = "oauth_state";
const FLOW_TTL_MS = 10 * 60 * 1000;

const flowCookieBase: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax",
  maxAge: FLOW_TTL_MS,
};

export const googleStart: RequestHandler = (_req, res) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  res.cookie(STATE_COOKIE, state, { ...flowCookieBase, path: "/" });
  res.cookie(PKCE_COOKIE, codeVerifier, { ...flowCookieBase, path: "/" });

  const authUrl = buildAuthorizationUrl(state, codeChallenge);
  return res.redirect(authUrl);
};

export const googleCallback: RequestHandler = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  res.clearCookie(STATE_COOKIE, { ...flowCookieBase, path: "/" });
  res.clearCookie(PKCE_COOKIE, { ...flowCookieBase, path: "/" });

  if (error) {
    return res.redirect(`${env.frontendUrl}/login?oauth=cancelled`);
  }

  if (!code || !state) {
    return res.redirect(`${env.frontendUrl}/login?oauth=invalid`);
  }

  const stateGuardado = req.cookies?.[STATE_COOKIE];
  const codeVerifier = req.cookies?.[PKCE_COOKIE];

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