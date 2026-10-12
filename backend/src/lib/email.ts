import { env } from "../config/env.js";
import { OTP_TTL_MINUTES } from "./otp.js";

// Envía el código de verificación. true si salió, false si falló.
// Sin RESEND_API_KEY: en desarrollo imprime el código en consola;
// en producción devuelve false.
export async function sendVerificationEmail(
  to: string,
  nombres: string,
  code: string
): Promise<boolean> {
  if (!env.resendApiKey) {
    if (!env.isProduction) {
      console.log(`[DEV] Código de verificación para ${to}: ${code}`);
      return true;
    }
    console.error("RESEND_API_KEY no configurada: no se envió el código.");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to,
        subject: "Tu código de verificación",
        html: `<p>Hola ${nombres},</p>
<p>Tu código de verificación es: <strong style="font-size:20px">${code}</strong></p>
<p>Expira en ${OTP_TTL_MINUTES} minutos. Si no lo solicitaste, ignora este mensaje.</p>`,
      }),
    });

    if (!response.ok) {
      console.error("Resend respondió con error:", response.status);
    }
    return response.ok;
  } catch (error: unknown) {
    console.error("Error enviando correo:", error);
    return false;
  }
}