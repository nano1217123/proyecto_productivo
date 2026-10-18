import { createHash, randomBytes } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

const UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Convierte "15m", "7d", etc. a milisegundos.
export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Duración inválida en .env: ${value}`);
  return Number(match[1]) * (UNITS[match[2] as string] ?? 0);
}

// ---------- Access token (JWT) ----------

export interface AccessTokenPayload {
  sub: string; // idusuario
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

// Devuelve el payload o null si es inválido/expirado.
// Se fija el algoritmo para evitar ataques con "alg: none".
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (
      typeof decoded === "object" &&
      typeof decoded.sub === "string" &&
      typeof decoded.email === "string"
    ) {
      return { sub: decoded.sub, email: decoded.email };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------- Refresh token (opaco) ----------

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

// SHA-256: el token ya es aleatorio de alta entropía, no necesita bcrypt.
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + durationToMs(env.refreshTokenExpiresIn));
}