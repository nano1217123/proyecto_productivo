import "dotenv/config";
import { env } from "./env.js";
import { redirectAdmitidaPorWompi } from "../lib/wompi.js";

// Configuración del módulo de pagos con Wompi.
// Se mantiene fuera de config/env.ts para que el módulo de pagos sea
// independiente: si faltan las llaves o la tasa, el servidor arranca igual y
// los endpoints de pago responden 503 hasta que se configuren.
//
// Este paso solo admite el ambiente Sandbox de Wompi: se rechazan las
// llaves de producción al arrancar.

const CHECKOUT_URL_POR_DEFECTO = "https://checkout.wompi.co/p/";
const API_URL_POR_DEFECTO = "https://sandbox.wompi.co/v1";

// Exige el prefijo de Sandbox si la variable viene definida.
function leerLlaveSandbox(nombre: string, prefijo: string): string {
  const valor = process.env[nombre]?.trim() ?? "";
  if (valor && !valor.startsWith(prefijo)) {
    throw new Error(
      `${nombre} debe ser una llave de Sandbox (prefijo "${prefijo}").`
    );
  }
  return valor;
}

// redirect-url es opcional en Wompi. Si apunta a localhost o a una red
// privada, el checkout responde 403 (CloudFront) antes de cargar, así que
// se omite: el pago se confirma por el webhook, no por la redirección.
// Para probar la redirección en local, usa WOMPI_REDIRECT_URL con un túnel
// público (https) hacia el frontend.
function resolverRedirectUrl(): string {
  const url =
    process.env.WOMPI_REDIRECT_URL?.trim() ||
    `${env.frontendUrl}/dashboard/pagos/resultado`;
  if (!redirectAdmitidaPorWompi(url)) {
    console.warn(
      `[wompi] redirect-url omitida: ${url} es local o privada y Wompi la bloquea (403).`
    );
    return "";
  }
  return url;
}

export interface WompiConfig {
  publicKey: string;
  integritySecret: string;
  checkoutUrl: string;
  redirectUrl: string;
  // Secreto de eventos: valida la firma de los webhooks. Si falta, el
  // webhook rechaza todos los eventos (503).
  eventsSecret: string;
  // Llave privada: consulta la transacción en la API de Wompi antes de
  // actualizar un pago. Nunca sale del backend.
  privateKey: string;
  // URL base de la API de Wompi (Sandbox por defecto).
  apiUrl: string;
  // Tasa USD → COP tal como viene del entorno. Se valida en el servicio
  // en cada intento (ver lib/pagosPrecios.ts). Solo para Sandbox: la
  // política de conversión de producción está pendiente.
  tasaUsdCop: string;
}

export const wompiConfig: WompiConfig = {
  publicKey: leerLlaveSandbox("WOMPI_PUBLIC_KEY", "pub_test_"),
  integritySecret: leerLlaveSandbox("WOMPI_INTEGRITY_SECRET", "test_integrity_"),
  checkoutUrl: process.env.WOMPI_CHECKOUT_URL?.trim() || CHECKOUT_URL_POR_DEFECTO,
  redirectUrl: resolverRedirectUrl(),
  eventsSecret: leerLlaveSandbox("WOMPI_EVENTS_SECRET", "test_events_"),
  privateKey: leerLlaveSandbox("WOMPI_PRIVATE_KEY", "prv_test_"),
  apiUrl: (process.env.WOMPI_API_URL?.trim() || API_URL_POR_DEFECTO).replace(/\/+$/, ""),
  tasaUsdCop: process.env.USD_COP_TASA?.trim() ?? "",
};
