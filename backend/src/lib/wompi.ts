import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  STATUS_TRANSACCION_WOMPI,
  type EstadoPago,
  type EventoWompi,
  type StatusTransaccionWompi,
  type TransaccionWompi,
} from "../types/pagos.types.js";

// Utilidades puras para Wompi Checkout Web.
// Documentación: https://docs.wompi.co/docs/colombia/widget-checkout-web/

// Referencia única del pago: alfanumérica con guiones, como recomienda Wompi.
// Combina la marca de tiempo con bytes aleatorios; la columna es UNIQUE.
export function generarReferenciaPago(): string {
  const tiempo = Date.now().toString(36);
  const aleatorio = randomBytes(10).toString("hex");
  return `jjgym-${tiempo}-${aleatorio}`;
}

// Firma de integridad: SHA-256 en hexadecimal de
// <referencia><montoEnCentavos><moneda><secretoIntegridad>.
// Debe calcularse SIEMPRE en el servidor: el secreto nunca sale del backend.
export function calcularFirmaIntegridad(params: {
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  secretoIntegridad: string;
}): string {
  const cadena =
    `${params.referencia}${params.montoEnCentavos}` +
    `${params.moneda}${params.secretoIntegridad}`;
  return createHash("sha256").update(cadena, "utf8").digest("hex");
}

// true si Wompi acepta la URL como redirect-url. El firewall (CloudFront)
// de checkout.wompi.co responde 403 "Request blocked" cuando redirect-url
// apunta a localhost, loopback o una red privada, así que esas URL no se
// envían. También descarta URL inválidas o que no sean http(s).
export function redirectAdmitidaPorWompi(valor: string): boolean {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "::1" || host === "::" || /^f[cd]|^fe80:/.test(host)) return false;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return false;
    }
  }
  return true;
}

// redirect-url propia de cada intento: añade ?referencia=<ref> para que la
// página de resultado identifique el pago aunque el navegador no lo haya
// guardado. Wompi añade después su propio ?id=<transacción>. redirect-url
// no forma parte de la firma de integridad.
export function redirectConReferencia(base: string, referencia: string): string {
  const url = new URL(base);
  url.searchParams.set("referencia", referencia);
  return url.toString();
}

// URL del checkout web de Wompi con los parámetros GET documentados.
export function construirUrlCheckout(params: {
  checkoutUrl: string;
  publicKey: string;
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  firma: string;
  redirectUrl?: string;
  correoCliente?: string;
}): string {
  const url = new URL(params.checkoutUrl);
  url.searchParams.set("public-key", params.publicKey);
  url.searchParams.set("currency", params.moneda);
  url.searchParams.set("amount-in-cents", String(params.montoEnCentavos));
  url.searchParams.set("reference", params.referencia);
  url.searchParams.set("signature:integrity", params.firma);
  if (params.redirectUrl) {
    url.searchParams.set("redirect-url", params.redirectUrl);
  }
  if (params.correoCliente) {
    url.searchParams.set("customer-data:email", params.correoCliente);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Eventos (webhook)
// Documentación: https://docs.wompi.co/docs/colombia/eventos/
// ---------------------------------------------------------------------------

export const ESTADO_POR_STATUS_WOMPI: Record<StatusTransaccionWompi, EstadoPago> = {
  PENDING: "PENDIENTE",
  APPROVED: "APROBADO",
  DECLINED: "RECHAZADO",
  VOIDED: "ANULADO",
  ERROR: "ERROR",
};

const CHECKSUM_REGEX = /^[0-9a-f]{64}$/i;
const SEGMENTO_RUTA_REGEX = /^[A-Za-z0-9_]+$/;

// Lee una ruta como "transaction.amount_in_cents" dentro de `data`.
// Solo recorre propiedades propias. Devuelve undefined si la ruta no existe
// o si el valor no es un string, número o booleano.
function leerPropiedad(data: Record<string, unknown>, ruta: string): string | undefined {
  let actual: unknown = data;
  for (const segmento of ruta.split(".")) {
    if (!SEGMENTO_RUTA_REGEX.test(segmento)) return undefined;
    if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
      return undefined;
    }
    if (!Object.hasOwn(actual, segmento)) return undefined;
    actual = (actual as Record<string, unknown>)[segmento];
  }
  if (typeof actual === "string") return actual;
  if (typeof actual === "number" || typeof actual === "boolean") return String(actual);
  return undefined;
}

// Checksum del evento: SHA-256 de los valores de signature.properties (en
// el orden recibido, leídos de `data`), seguidos del timestamp del evento y
// del secreto de eventos, sin separadores. null si falta alguna propiedad.
export function calcularChecksumEvento(
  evento: EventoWompi,
  secretoEventos: string
): string | null {
  let cadena = "";
  for (const ruta of evento.signature.properties) {
    const valor = leerPropiedad(evento.data, ruta);
    if (valor === undefined) return null;
    cadena += valor;
  }
  cadena += `${evento.timestamp}${secretoEventos}`;
  return createHash("sha256").update(cadena, "utf8").digest("hex");
}

// Compara dos checksums hexadecimales en tiempo constante, sin distinguir
// mayúsculas (el ejemplo de Wompi viene en mayúsculas).
function checksumsIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a.toLowerCase(), "utf8");
  const bufB = Buffer.from(b.toLowerCase(), "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// true si la firma del evento es válida. Wompi envía el checksum en el body
// (signature.checksum) y en la cabecera X-Event-Checksum. Si llegan ambos,
// deben coincidir.
export function verificarFirmaEvento(
  evento: EventoWompi,
  secretoEventos: string,
  checksumCabecera?: string
): boolean {
  if (!secretoEventos) return false;
  const recibido = evento.signature.checksum;
  if (!CHECKSUM_REGEX.test(recibido)) return false;
  if (checksumCabecera !== undefined && !checksumsIguales(checksumCabecera, recibido)) {
    return false;
  }
  if (evento.signature.properties.length === 0) return false;
  const esperado = calcularChecksumEvento(evento, secretoEventos);
  return esperado !== null && checksumsIguales(esperado, recibido);
}

// Extrae y valida los campos de una transacción (del evento o de la API).
// null si falta alguno o tiene un tipo inesperado.
export function parseTransaccionWompi(valor: unknown): TransaccionWompi | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
  const { id, reference, status, amount_in_cents: monto, currency } =
    valor as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
  if (typeof reference !== "string" || reference.length === 0 || reference.length > 64) {
    return null;
  }
  if (typeof currency !== "string" || currency.length !== 3) return null;
  if (typeof monto !== "number" || !Number.isSafeInteger(monto) || monto <= 0) return null;
  if (
    typeof status !== "string" ||
    !(STATUS_TRANSACCION_WOMPI as readonly string[]).includes(status)
  ) {
    return null;
  }
  const transaccion: TransaccionWompi = {
    id,
    reference,
    status: status as StatusTransaccionWompi,
    amountInCents: monto,
    currency,
  };
  const finalizada = (valor as Record<string, unknown>).finalized_at;
  if (typeof finalizada === "string") {
    const fecha = new Date(finalizada);
    if (!Number.isNaN(fecha.getTime())) transaccion.finalizadaEn = fecha;
  }
  return transaccion;
}

// Consulta una transacción en la API de Wompi (GET /v1/transactions/{id})
// con la llave privada. Devuelve null si Wompi responde 404 y lanza un error
// ante cualquier otro fallo (red, tiempo de espera, respuesta inesperada).
export type ConsultarTransaccionWompi = (id: string) => Promise<TransaccionWompi | null>;

export function crearConsultaTransaccionWompi(params: {
  apiUrl: string;
  privateKey: string;
  timeoutMs?: number;
}): ConsultarTransaccionWompi {
  return async (id) => {
    const respuesta = await fetch(
      `${params.apiUrl}/transactions/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${params.privateKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(params.timeoutMs ?? 10_000),
      }
    );
    if (respuesta.status === 404) return null;
    if (!respuesta.ok) {
      throw new Error(`Wompi respondió ${respuesta.status} al consultar la transacción.`);
    }
    const cuerpo = (await respuesta.json()) as { data?: unknown } | null;
    const transaccion = parseTransaccionWompi(cuerpo?.data);
    if (!transaccion) {
      throw new Error("La respuesta de Wompi no tiene el formato esperado.");
    }
    return transaccion;
  };
}

// Busca las transacciones de una referencia en la API de Wompi
// (GET /v1/transactions?reference=…) con la llave privada. Sirve para
// conciliar un intento cuyo evento no llegó. Descarta las entradas con
// formato inesperado o de otra referencia y lanza un error ante fallos de
// red o respuestas no exitosas.
export type BuscarTransaccionesWompi = (referencia: string) => Promise<TransaccionWompi[]>;

export function crearBusquedaTransaccionesWompi(params: {
  apiUrl: string;
  privateKey: string;
  timeoutMs?: number;
}): BuscarTransaccionesWompi {
  return async (referencia) => {
    const respuesta = await fetch(
      `${params.apiUrl}/transactions?reference=${encodeURIComponent(referencia)}`,
      {
        headers: {
          Authorization: `Bearer ${params.privateKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(params.timeoutMs ?? 10_000),
      }
    );
    if (!respuesta.ok) {
      throw new Error(`Wompi respondió ${respuesta.status} al buscar transacciones.`);
    }
    const cuerpo = (await respuesta.json()) as { data?: unknown } | null;
    if (!Array.isArray(cuerpo?.data)) {
      throw new Error("La respuesta de Wompi no tiene el formato esperado.");
    }
    return cuerpo.data
      .map(parseTransaccionWompi)
      .filter((t): t is TransaccionWompi => t !== null && t.reference === referencia);
  };
}
