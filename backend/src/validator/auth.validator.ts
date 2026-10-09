import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import {
  TIPOS_ADMIN_PERMITIDOS,
  type CreateAdminInput,
  type TipoAdminPermitido,
} from "../types/auth.types.js";

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