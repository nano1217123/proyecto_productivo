import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "./error.middleware.js";

const verificationSchema = z.object({
  success: z.literal(true),
  action: z.string(),
  score: z.number().min(0).max(1),
});

export function verifyRecaptcha(action: "login" | "register") {
  return asyncHandler(async (_req, res, next) => {
    if (!env.recaptchaSecretKey) {
      next();
      return;
    }

    const token: unknown = res.locals.recaptchaToken;
    if (typeof token !== "string" || !token.trim()) {
      throw new AppError(400, "Falta la verificación reCAPTCHA. Recarga la página e inténtalo de nuevo.");
    }

    let result: unknown;
    try {
      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        body: new URLSearchParams({
          secret: env.recaptchaSecretKey,
          response: token,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error("siteverify no está disponible");
      }
      result = await response.json();
    } catch {
      throw new AppError(503, "No se pudo verificar reCAPTCHA. Inténtalo de nuevo.");
    }

    const verification = verificationSchema.safeParse(result);
    if (
      !verification.success ||
      verification.data.action !== action ||
      verification.data.score < env.recaptchaMinScore
    ) {
      throw new AppError(422, "No se pudo verificar reCAPTCHA. Inténtalo de nuevo.");
    }

    next();
  });
}
