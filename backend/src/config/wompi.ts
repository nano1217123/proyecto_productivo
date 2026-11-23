import "dotenv/config";
import { env } from "./env.js";

// Configuración del módulo de pagos con Wompi.
// Se mantiene fuera de config/env.ts para que el módulo de pagos sea
// independiente: si faltan las llaves o la tasa, el servidor arranca igual y
// los endpoints de pago responden 503 hasta que se configuren.
//
// Este paso solo admite el ambiente Sandbox de Wompi: se rechazan las
// llaves de producción al arrancar.

const CHECKOUT_URL_POR_DEFECTO = "https://checkout.wompi.co/p/";

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

export interface WompiConfig {
  publicKey: string;
  integritySecret: string;
  checkoutUrl: string;
  redirectUrl: string;
  // Tasa USD → COP tal como viene del entorno. Se valida en el servicio
  // en cada intento (ver lib/pagosPrecios.ts). Solo para Sandbox: la
  // política de conversión de producción está pendiente.
  tasaUsdCop: string;
}

export const wompiConfig: WompiConfig = {
  publicKey: leerLlaveSandbox("WOMPI_PUBLIC_KEY", "pub_test_"),
  integritySecret: leerLlaveSandbox("WOMPI_INTEGRITY_SECRET", "test_integrity_"),
  checkoutUrl: process.env.WOMPI_CHECKOUT_URL?.trim() || CHECKOUT_URL_POR_DEFECTO,
  redirectUrl:
    process.env.WOMPI_REDIRECT_URL?.trim() ||
    `${env.frontendUrl}/dashboard/pagos/resultado`,
  tasaUsdCop: process.env.USD_COP_TASA?.trim() ?? "",
};
