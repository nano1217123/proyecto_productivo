/**
 * Política de contraseñas.
 *
 * Reglas:
 *   - Longitud: 8 a 30 caracteres (bcrypt trunca a 72 bytes, pero
 *     limitamos a 30 por usabilidad y para evitar truncamientos).
 *   - Al menos 1 letra.
 *   - Al menos 1 número.
 *   - Al menos 1 mayúscula.
 *   - No puede estar en la lista negra de contraseñas comunes.
 *   - No puede ser igual al email ni al nombre del usuario.
 *
 * Se permiten símbolos (@, #, $, etc.) pero no se exigen.
 */

const MIN_LENGTH = 8;
const MAX_LENGTH = 30;

// Lista negra: contraseñas comunes y predecibles.
// Ampliable en el futuro. Todas en minúsculas para comparar sin distinguir.
const BLACKLIST = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwertyuiop",
  "admin123",
  "administrator",
  "letmein1",
  "welcome1",
  "iloveyou",
  "monkey123",
  "dragon123",
  "abc12345",
  "password1!",
  "contraseña",
  "contrasena",
  "12345678a",
]);

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Valida una contraseña según la política.
 * Devuelve { valid: true } o { valid: false, message }.
 *
 * `email` y `nombre` son opcionales. Si se pasan, se comparan contra
 * la contraseña para rechazar coincidencias triviales.
 */
export function validatePassword(
  password: string,
  email?: string,
  nombre?: string
): PasswordValidationResult {
  // 1. Longitud.
  if (password.length < MIN_LENGTH) {
    return {
      valid: false,
      message: `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`,
    };
  }

  if (password.length > MAX_LENGTH) {
    return {
      valid: false,
      message: `La contraseña no puede superar los ${MAX_LENGTH} caracteres.`,
    };
  }

  // 2. Al menos una letra.
  if (!/[a-zA-Z]/.test(password)) {
    return {
      valid: false,
      message: "La contraseña debe incluir al menos una letra.",
    };
  }

  // 3. Al menos un número.
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: "La contraseña debe incluir al menos un número.",
    };
  }

  // 4. Al menos una mayúscula.
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "La contraseña debe incluir al menos una mayúscula.",
    };
  }

  // 5. Lista negra (comparación en minúsculas).
  if (BLACKLIST.has(password.toLowerCase())) {
    return {
      valid: false,
      message: "Esa contraseña es demasiado común. Elige otra.",
    };
  }

  // 6. No puede ser igual al email (sin dominio ni símbolos) ni al nombre.
  if (email) {
    const emailLocal = email.split("@")[0]?.toLowerCase() ?? "";
    if (emailLocal && password.toLowerCase() === emailLocal) {
      return {
        valid: false,
        message: "La contraseña no puede ser igual a tu correo.",
      };
    }
  }

  if (nombre) {
    const nombreLimpio = nombre.toLowerCase().replace(/\s+/g, "");
    if (nombreLimpio && password.toLowerCase() === nombreLimpio) {
      return {
        valid: false,
        message: "La contraseña no puede ser igual a tu nombre.",
      };
    }
  }

  // 7. No puede estar compuesta solo por un patrón repetido.
  //    Ej: "aaaaaaaa", "11111111".
  if (/^(.)\1+$/.test(password)) {
    return {
      valid: false,
      message: "La contraseña no puede ser un solo carácter repetido.",
    };
  }

  return { valid: true };
}