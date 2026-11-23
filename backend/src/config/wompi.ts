import "dotenv/config";
import { env } from "./env.js";
import type { PlanSuscripcion } from "../types/pagos.types.js";

// Configuración del módulo de pagos con Wompi.
// Se mantiene fuera de config/env.ts para que el módulo de pagos sea
// independiente: si faltan las llaves, el servidor arranca igual y los
// endpoints de pago responden 503 hasta que se configuren.
//
// Este paso solo admite el ambiente Sandbox de Wompi: se rechazan las
// llaves de producción al arrancar.

const CHECKOUT_URL_POR_DEFECTO = "https://checkout.wompi.co/p/";

// Lee un importe en centavos COP. Vacío → null (pago no disponible).
function leerCentavos(nombre: string): number | null {
  const raw = process.env[nombre]?.trim();
  if (!raw) return null;

  if (!/^\d+$/.test(raw)) {
    throw new Error(`${nombre} debe ser un entero positivo en centavos COP.`);
  }

  const valor = Number(raw);
  if (!Number.isSafeInteger(valor) || valor <= 0 || valor > 2_147_483_647) {
    throw new Error(`${nombre} está fuera del rango permitido.`);
  }
  return valor;
}

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
  montosEnCentavos: Record<PlanSuscripcion, number | null>;
}

export const wompiConfig: WompiConfig = {
  publicKey: leerLlaveSandbox("WOMPI_PUBLIC_KEY", "pub_test_"),
  integritySecret: leerLlaveSandbox("WOMPI_INTEGRITY_SECRET", "test_integrity_"),
  checkoutUrl: process.env.WOMPI_CHECKOUT_URL?.trim() || CHECKOUT_URL_POR_DEFECTO,
  redirectUrl:
    process.env.WOMPI_REDIRECT_URL?.trim() ||
    `${env.frontendUrl}/dashboard/pagos/resultado`,
  montosEnCentavos: {
    suscripcion_sede: leerCentavos("PAGO_MONTO_SEDE_CENTAVOS"),
    suscripcion_particular: leerCentavos("PAGO_MONTO_PARTICULAR_CENTAVOS"),
  },
};
