/**
 * Política de emails.
 *
 * Reglas:
 *   - Formato válido (regex estricta, no solo "tiene @ y .").
 *   - Longitud máxima 254 (estándar RFC 5321).
 *   - Longitud mínima razonable (6: "a@b.co").
 *   - No puede estar en la lista negra de dominios desechables.
 *   - Solo se permiten dominios con TLD de 2+ letras.
 */

const MAX_LENGTH = 254;
const MIN_LENGTH = 6;

// Regex razonablemente estricta para emails.
// - Parte local: letras, números, . _ % + -
// - Dominio: letras, números, guiones, con al menos un punto
// - TLD: 2 o más letras
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Dominios desechables comunes. Ampliable.
// Todos en minúsculas para comparar sin distinguir mayúsculas.
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com",
  "temp-mail.org",
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "10minutemail.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "maildrop.cc",
  "fakeinbox.com",
  "dispostable.com",
  "mailnesia.com",
  "mintemail.com",
  "spam4.me",
  "grr.la",
  "mailcatch.com",
  "tempr.email",
]);

export interface EmailValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Valida un email según la política.
 * Devuelve { valid: true } o { valid: false, message }.
 *
 * Se asume que el email ya pasó por sanitizeEmail() (minúsculas, sin
 * espacios). Si no, esta función igual lo valida, pero es responsabilidad
 * del validador llamar a sanitizeEmail primero.
 */
export function validateEmail(email: string): EmailValidationResult {
  // 1. Longitud.
  if (email.length < MIN_LENGTH) {
    return { valid: false, message: "El correo es demasiado corto." };
  }

  if (email.length > MAX_LENGTH) {
    return {
      valid: false,
      message: `El correo no puede superar los ${MAX_LENGTH} caracteres.`,
    };
  }

  // 2. Formato.
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: "El correo no tiene un formato válido." };
  }

  // 3. Extraer dominio (después del @).
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  if (!domain) {
    return { valid: false, message: "El correo no tiene un dominio válido." };
  }

  // 4. Comprobar que no es un dominio desechable.
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      message:
        "No se permiten correos temporales o desechables. Usa un correo permanente.",
    };
  }

  // 5. Comprobar que el TLD no es solo números.
  const tld = domain.split(".").pop() ?? "";
  if (!/^[a-z]{2,}$/.test(tld)) {
    return { valid: false, message: "El dominio del correo no es válido." };
  }

  return { valid: true };
}