/**
 * Utilidades de saneamiento de entrada.
 *
 * No sustituyen a la validación: trabajan junto a ella. La validación
 * decide si el dato es aceptable; el saneamiento elimina caracteres
 * peligrosos antes de guardar.
 *
 * Prisma parametriza las queries automáticamente (evita SQL injection),
 * pero el saneamiento sigue siendo necesario para:
 *   - Evitar XSS si el frontend renderiza HTML.
 *   - Evitar payloads con caracteres de control.
 *   - Normalizar espacios y caracteres Unicode raros.
 */

// Caracteres de control (excepto \n \r \t). Suelen ser vectores de ataque
// o errores de encoding.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Etiquetas HTML básicas y secuencias de script.
const HTML_TAGS = /<\/?[a-z][\s\S]*?>/gi;
const SCRIPT_PATTERNS = /(javascript:|data:text\/html|<script|<\/script)/gi;

/**
 * Limpia un string de entrada:
 *   1. Recorta espacios exteriores.
 *   2. Elimina caracteres de control.
 *   3. Elimina etiquetas HTML y secuencias de script.
 *   4. Colapsa espacios internos múltiples a uno solo.
 *   5. Normaliza Unicode (NFC) para que ñ y tildes queden consistentes.
 *
 * El resultado es seguro para guardar y mostrar.
 */
export function sanitizeString(input: string): string {
  return input
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAGS, "")
    .replace(SCRIPT_PATTERNS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Saneamiento específico para emails. Solo elimina espacios y baja a
 * minúsculas. No elimina símbolos porque los emails los necesitan
 * (@, ., +, -, _).
 */
export function sanitizeEmail(input: string): string {
  return input
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Saneamiento para nombres y apellidos. Elimina todo lo que no sea:
 *   - Letras (incluidas ñ, tildes, diéresis).
 *   - Espacios.
 *   - Guiones (-).
 *   - Apóstrofes (').
 *
 * Rechaza números, emojis, símbolos HTML, etc.
 */
export function sanitizeName(input: string): string {
  return input
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(/[^\p{L}\s'\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detecta si un string contiene intentos de inyección SQL o HTML.
 * Se usa como segunda barrera además de la validación principal.
 */
export function containsSuspiciousPatterns(input: string): boolean {
  const suspicious =
    /(--|;|\/\*|\*\/|<script|<\/script|javascript:|data:text\/html|union\s+select|drop\s+table|insert\s+into|delete\s+from)/i;
  return suspicious.test(input);
}