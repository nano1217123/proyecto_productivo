// Validaciones de entrada para el módulo de pagos.
import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import type { IniciarPagoInput } from "../types/pagos.types.js";

// Formato de slug de sede (p. ej. "jj-poblado"). La autorización real se
// hace en el servicio contra admin_sedes.
const GYM_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GYM_SLUG_MAX = 64;

// Solo se acepta gymSlug. Cualquier otro campo (plan, monto, moneda...) se
// descarta: el backend determina el plan y el importe.
export function parseIniciarPagoBody(body: unknown): IniciarPagoInput {
  if (body === undefined || body === null) {
    return { gymSlug: null };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "Los datos del pago no son válidos.");
  }

  const { gymSlug } = body as Record<string, unknown>;

  if (gymSlug === undefined || gymSlug === null || gymSlug === "") {
    return { gymSlug: null };
  }
  if (
    typeof gymSlug !== "string" ||
    gymSlug.length > GYM_SLUG_MAX ||
    !GYM_SLUG_REGEX.test(gymSlug)
  ) {
    throw new AppError(400, "La sede indicada no es válida.");
  }
  return { gymSlug };
}

export const validateIniciarPago: RequestHandler = (req, _res, next) => {
  req.body = parseIniciarPagoBody(req.body);
  next();
};
