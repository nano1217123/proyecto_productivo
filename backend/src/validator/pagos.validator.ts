// Validaciones de entrada para el módulo de pagos.
import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import type {
  ConsultaEstadoPagoInput,
  EventoWompi,
  IniciarPagoInput,
} from "../types/pagos.types.js";

// Formato de slug de sede (p. ej. "jj-poblado"). La autorización real se
// hace en el servicio contra admin_sedes.
const GYM_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GYM_SLUG_MAX = 64;

// Solo se aceptan gymSlug y montoEnCentavos (el importe COP que el usuario
// confirmó). Cualquier otro campo (plan, moneda...) se descarta: el backend
// determina el plan y el importe; montoEnCentavos solo sirve para comprobar
// que el usuario confirmó el importe vigente.
export function parseIniciarPagoBody(body: unknown): IniciarPagoInput {
  if (body === undefined || body === null) {
    return { gymSlug: null, montoEnCentavos: null };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "Los datos del pago no son válidos.");
  }

  const { gymSlug, montoEnCentavos } = body as Record<string, unknown>;

  let monto: number | null = null;
  if (montoEnCentavos !== undefined && montoEnCentavos !== null) {
    if (
      typeof montoEnCentavos !== "number" ||
      !Number.isSafeInteger(montoEnCentavos) ||
      montoEnCentavos <= 0
    ) {
      throw new AppError(400, "El importe indicado no es válido.");
    }
    monto = montoEnCentavos;
  }

  if (gymSlug === undefined || gymSlug === null || gymSlug === "") {
    return { gymSlug: null, montoEnCentavos: monto };
  }
  if (
    typeof gymSlug !== "string" ||
    gymSlug.length > GYM_SLUG_MAX ||
    !GYM_SLUG_REGEX.test(gymSlug)
  ) {
    throw new AppError(400, "La sede indicada no es válida.");
  }
  return { gymSlug, montoEnCentavos: monto };
}

export const validateIniciarPago: RequestHandler = (req, _res, next) => {
  req.body = parseIniciarPagoBody(req.body);
  next();
};

// Query de GET /api/pagos/estado: ?referencia=<ref> y/o ?id=<transacción>.
// Ambos son identificadores opacos: letras, números, guiones y guion bajo.
const IDENTIFICADOR_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

function leerIdentificador(valor: unknown, mensaje: string): string | null {
  if (valor === undefined || valor === "") return null;
  if (typeof valor !== "string" || !IDENTIFICADOR_REGEX.test(valor)) {
    throw new AppError(400, mensaje);
  }
  return valor;
}

export function parseConsultaEstadoPago(query: unknown): ConsultaEstadoPagoInput {
  const q = esObjeto(query) ? query : {};
  const referencia = leerIdentificador(q.referencia, "La referencia del pago no es válida.");
  const transaccionId = leerIdentificador(q.id, "El identificador de la transacción no es válido.");
  if (!referencia && !transaccionId) {
    throw new AppError(400, "Indica la referencia del pago.");
  }
  return { referencia, transaccionId };
}

export const validateConsultaEstadoPago: RequestHandler = (req, res, next) => {
  // La consulta validada se guarda en res.locals (req.query conserva el
  // tipo genérico de Express y es de solo lectura en Express 5).
  res.locals.consultaEstadoPago = parseConsultaEstadoPago(req.query);
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
