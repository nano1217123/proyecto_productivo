import { createHash, randomBytes } from "node:crypto";

// TTL del token de recuperación (1 hora).
export const RESET_TOKEN_TTL_MINUTES = 60;

// 32 bytes aleatorios = 64 caracteres hex = 256 bits de entropía.
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

// SHA-256: el token ya es aleatorio de alta entropía, no necesita bcrypt.
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiresAt(): Date {
  return new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
}