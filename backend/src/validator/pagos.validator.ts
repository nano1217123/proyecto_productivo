// Validaciones de entrada para el módulo de pagos.
import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import type { EventoWompi, IniciarPagoInput } from "../types/pagos.types.js";

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

// Forma mínima de un evento de Wompi (POST /api/pagos/wompi/webhook).
// Solo valida la estructura necesaria para verificar la firma; los campos
// de la transacción se validan en el servicio después de la firma.
const MAX_PROPIEDADES_FIRMA = 10;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export const validateEventoWompi: RequestHandler = (req, _res, next) => {
  req.body = parseEventoWompi(req.body);
  next();
};

export function parseEventoWompi(body: unknown): EventoWompi {
  const invalido = () => new AppError(400, "El evento no tiene el formato esperado.");

  if (!esObjeto(body)) throw invalido();
  const { event, data, environment, signature, timestamp } = body;

  if (typeof event !== "string" || event.length === 0 || event.length > 100) throw invalido();
  if (!esObjeto(data)) throw invalido();
  if (typeof environment !== "string") throw invalido();
  if (typeof timestamp !== "number" || !Number.isSafeInteger(timestamp) || timestamp <= 0) {
    throw invalido();
  }
  if (!esObjeto(signature)) throw invalido();
  const { properties, checksum } = signature;
  if (
    !Array.isArray(properties) ||
    properties.length === 0 ||
    properties.length > MAX_PROPIEDADES_FIRMA ||
    !properties.every((p) => typeof p === "string" && p.length > 0 && p.length <= 100)
  ) {
    throw invalido();
  }
  if (typeof checksum !== "string") throw invalido();

  return {
    event,
    data,
    environment,
    signature: { properties: properties as string[], checksum },
    timestamp,
  };
}
