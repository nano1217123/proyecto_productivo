import type { Response } from "express";
import { env } from "../config/env.js";
import { durationToMs } from "./tokens.js";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

// El refresh token solo viaja a las rutas de auth.
const REFRESH_PATH = "/api/auth";

const base = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict" as const,
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    path: "/",
    maxAge: durationToMs(env.jwtExpiresIn),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: durationToMs(env.refreshTokenExpiresIn),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...base, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
}