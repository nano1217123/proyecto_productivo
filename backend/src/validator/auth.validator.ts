import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import {
  TIPOS_ADMIN_PERMITIDOS,
  type CreateAdminInput,
  type TipoAdminPermitido,
} from "../types/auth.types.js";
import { sanitizeString, sanitizeEmail, sanitizeName, containsSuspiciousPatterns } from "../lib/sanitize.js";
import { validatePassword } from "../lib/passwordPolicy.js";
import { validateEmail } from "../lib/emailPolicy.js";
import type { RegisterInput } from "../types/auth.types.js";
const LIMITES = {
  nombreMax: 60,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 30,
} as const;

const MENSAJE_CAMPOS_REQUERIDOS =
  "Faltan campos requeridos: nombres, apellidos, email, password, tipoUsuario.";

function esTipoAdminPermitido(valor: string): valor is TipoAdminPermitido {
  return (TIPOS_ADMIN_PERMITIDOS as readonly string[]).includes(valor);
}

// Función pura: valida el cuerpo, limpia espacios y devuelve datos tipados.
// Lanza AppError(400) con el primer problema que encuentre.
export function parseCreateAdminBody(body: unknown): CreateAdminInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(400, MENSAJE_CAMPOS_REQUERIDOS);
  }

  const { nombres, apellidos, email, password, tipoUsuario } =
    body as Record<string, unknown>;

  // 1. Campos presentes.
  if (!nombres || !apellidos || !email || !password || !tipoUsuario) {
    throw new AppError(400, MENSAJE_CAMPOS_REQUERIDOS);
  }

  // 2. Tipos de datos.
  if (
    typeof nombres !== "string" ||
    typeof apellidos !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof tipoUsuario !== "string"
  ) {
    throw new AppError(
      400,
      "Los campos nombres, apellidos, email, password y tipoUsuario deben ser cadenas de texto."
    );
  }

  // 3. Limpiar espacios exteriores (la contraseña no se modifica).
  const nombresTrim = nombres.trim();
  const apellidosTrim = apellidos.trim();
  const emailTrim = email.trim();

  // 4. Nombres y apellidos.
  if (!nombresTrim || !apellidosTrim) {
    throw new AppError(
      400,
      "Nombres y apellidos no pueden estar vacíos ni contener solo espacios."
    );
  }

  if (
    nombresTrim.length > LIMITES.nombreMax ||
    apellidosTrim.length > LIMITES.nombreMax
  ) {
    throw new AppError(
      400,
      `Nombres y apellidos no pueden superar los ${LIMITES.nombreMax} caracteres.`
    );
  }

  // 5. Correo.
  if (!emailTrim || emailTrim.length > LIMITES.emailMax) {
    throw new AppError(400, "El correo no es válido.");
  }

  // 6. Solo se permite crear administradores de gimnasio.
  if (!esTipoAdminPermitido(tipoUsuario)) {
    throw new AppError(
      400,
      `tipoUsuario debe ser uno de: ${TIPOS_ADMIN_PERMITIDOS.join(", ")}.`
    );
  }

  // 7. Contraseña.
  if (password.length < LIMITES.passwordMin) {
    throw new AppError(
      400,
      `La contraseña debe tener al menos ${LIMITES.passwordMin} caracteres.`
    );
  }

  if (password.length > LIMITES.passwordMax) {
    throw new AppError(
      400,
      `La contraseña no puede superar los ${LIMITES.passwordMax} caracteres.`
    );
  }

  return {
    nombres: nombresTrim,
    apellidos: apellidosTrim,
    email: emailTrim,
    password,
    tipoUsuario,
  };
}

// Middleware de Express: reemplaza req.body por los datos ya validados.
// Si algo falla, el AppError llega al errorHandler global.
export const validateCreateAdmin: RequestHandler = (req, _res, next) => {
  req.body = parseCreateAdminBody(req.body);
  next();
};

// ============================================================
// REGISTRO PÚBLICO
// Valida y limpia el body para POST /api/auth/register.
// ============================================================

const MENSAJE_REGISTRO_REQUERIDOS =
  "Faltan campos requeridos: nombres, apellidos, email, password.";

/**
 * Valida y limpia el cuerpo del registro público.
 * Devuelve RegisterInput ya normalizado o lanza AppError(400).
 *
 * Orden de validaciones:
 *   1. Estructura del body.
 *   2. Campos presentes y tipo string.
 *   3. Sanitización (XSS, control chars, espacios).
 *   4. Detección de patrones sospechosos (SQL injection, etc.).
 *   5. Longitud de nombres.
 *   6. Validación de email (formato, dominios desechables).
 *   7. Validación de contraseña (longitud, complejidad, lista negra).
 */
export function parseRegisterBody(body: unknown): RegisterInput {
  // 1. Estructura.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(400, MENSAJE_REGISTRO_REQUERIDOS);
  }

  const { nombres, apellidos, email, password } = body as Record<string, unknown>;

  // 2. Campos presentes.
  if (!nombres || !apellidos || !email || !password) {
    throw new AppError(400, MENSAJE_REGISTRO_REQUERIDOS);
  }

  // 3. Tipos.
  if (
    typeof nombres !== "string" ||
    typeof apellidos !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    throw new AppError(
      400,
      "Los campos nombres, apellidos, email y password deben ser cadenas de texto."
    );
  }

  // 4. Detección temprana de patrones sospechosos.
  //    (No sustituye la sanitización, la complementa.)
  const allStrings = [nombres, apellidos, email];
  for (const value of allStrings) {
    if (containsSuspiciousPatterns(value)) {
      throw new AppError(
        400,
        "La solicitud contiene caracteres no permitidos."
      );
    }
  }

  // 5. Sanitización.
  const nombresLimpio = sanitizeName(nombres);
  const apellidosLimpio = sanitizeName(apellidos);
  const emailLimpio = sanitizeEmail(email);
  // La contraseña NO se sanitiza (puede tener símbolos legítimos).

  // 6. Nombres no vacíos tras sanitizar.
  if (!nombresLimpio || !apellidosLimpio) {
    throw new AppError(
      400,
      "Nombres y apellidos no pueden estar vacíos ni contener solo caracteres no permitidos."
    );
  }

  // 7. Longitud de nombres.
  if (nombresLimpio.length < 2 || nombresLimpio.length > 60) {
    throw new AppError(
      400,
      "El nombre debe tener entre 2 y 60 caracteres."
    );
  }
  if (apellidosLimpio.length < 2 || apellidosLimpio.length > 60) {
    throw new AppError(
      400,
      "Los apellidos deben tener entre 2 y 60 caracteres."
    );
  }

  // 8. Validación de email.
  const emailCheck = validateEmail(emailLimpio);
  if (!emailCheck.valid) {
    throw new AppError(400, emailCheck.message ?? "El correo no es válido.");
  }

  // 9. Validación de contraseña.
  const passwordCheck = validatePassword(
    password,
    emailLimpio,
    nombresLimpio
  );
  if (!passwordCheck.valid) {
    throw new AppError(
      400,
      passwordCheck.message ?? "La contraseña no cumple los requisitos."
    );
  }

  return {
    nombres: nombresLimpio,
    apellidos: apellidosLimpio,
    email: emailLimpio,
    password,
  };
}

// Middleware de Express: reemplaza req.body por los datos ya validados.
export const validateRegister: RequestHandler = (req, _res, next) => {
  req.body = parseRegisterBody(req.body);
  next();
};