// Validación de entrada de la gestión de roles y sedes.
// El resultado validado se guarda en res.locals: req.query y req.params
// conservan los tipos genéricos de Express.
import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { sanitizeEmail } from "../lib/sanitize.js";
import { validateEmail } from "../lib/emailPolicy.js";
import { esSedeValida, SLUGS_SEDES } from "../lib/sedes.js";
import type { AsignarAdminInput, CuentaConfirmada } from "../types/gestion.types.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function leerCorreo(valor: unknown): string {
  if (typeof valor !== "string") throw new AppError(400, "Indica el correo de la cuenta.");
  const correo = sanitizeEmail(valor);
  if (!validateEmail(correo).valid) throw new AppError(400, "El correo no es válido.");
  return correo;
}

function leerUsuarioId(valor: unknown): string {
  if (typeof valor !== "string" || !UUID_REGEX.test(valor)) {
    throw new AppError(400, "La cuenta seleccionada no es válida.");
  }
  return valor.toLowerCase();
}

export function parseCuentaConfirmada(body: unknown): CuentaConfirmada {
  if (!esObjeto(body)) throw new AppError(400, "Los datos no son válidos.");
  return { usuarioId: leerUsuarioId(body.usuarioId), correo: leerCorreo(body.correo) };
}

// POST /api/auth/create-admin: { usuarioId, correo, gymSlugs }.
// Ya no crea cuentas: rechaza contraseña y cualquier rol distinto de admin.
export function parseAsignarAdmin(body: unknown): AsignarAdminInput {
  if (!esObjeto(body)) throw new AppError(400, "Los datos no son válidos.");
  if ("password" in body) {
    throw new AppError(
      400,
      "Ya no se crean cuentas con contraseña temporal. La persona debe registrarse y verificar su correo."
    );
  }
  if (body.tipoUsuario !== undefined && body.tipoUsuario !== "admin") {
    throw new AppError(400, "Este endpoint solo asigna el rol de administrador.");
  }
  const { usuarioId, correo } = parseCuentaConfirmada(body);
  const { gymSlugs } = body;
  if (
    !Array.isArray(gymSlugs) ||
    gymSlugs.length === 0 ||
    gymSlugs.length > SLUGS_SEDES.length ||
    !gymSlugs.every(esSedeValida) ||
    new Set(gymSlugs).size !== gymSlugs.length
  ) {
    throw new AppError(400, "Selecciona al menos una sede válida, sin repetir.");
  }
  return { usuarioId, correo, gymSlugs: [...gymSlugs].sort() };
}

export const validateBuscarCuenta: RequestHandler = (req, res, next) => {
  res.locals.correo = leerCorreo(req.query.correo);
  next();
};

export const validateSedeParam: RequestHandler = (req, res, next) => {
  const slug = req.params.slug;
  if (typeof slug !== "string" || slug.length > 64 || !SLUG_REGEX.test(slug)) {
    throw new AppError(404, "Sede no encontrada.");
  }
  res.locals.gymSlug = slug;
  next();
};

export const validateUsuarioIdParam: RequestHandler = (req, res, next) => {
  res.locals.usuarioId = leerUsuarioId(req.params.usuarioId);
  next();
};

export const validateCuentaConfirmada: RequestHandler = (req, res, next) => {
  res.locals.seleccion = parseCuentaConfirmada(req.body);
  next();
};

export const validateAsignarAdmin: RequestHandler = (req, res, next) => {
  res.locals.asignacion = parseAsignarAdmin(req.body);
  next();
};
