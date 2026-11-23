import { createHash, randomBytes } from "node:crypto";

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
