import { randomInt } from "node:crypto";
import { comparePassword, hashPassword } from "./hash.js";

export const OTP_TTL_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

// Código de 6 dígitos con generador criptográfico (nunca Math.random).
export function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

// El código se guarda hasheado, igual que una contraseña.
export function hashOtp(code: string): Promise<string> {
  return hashPassword(code);
}

export function verifyOtp(code: string, hash: string): Promise<boolean> {
  return comparePassword(code, hash);
}

export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}