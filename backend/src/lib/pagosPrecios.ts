import type { PeriodoSuscripcion, PlanSuscripcion } from "../types/pagos.types.js";

// Catálogo de suscripciones de JJ GYM (precios de referencia del proyecto).
// Solo existe el plan mensual; semestral, anual y descuentos están
// pendientes de aprobación por el equipo.
export const CATALOGO_PLANES: Record<
  PlanSuscripcion,
  { precioUsdCentavos: number; periodo: PeriodoSuscripcion }
> = {
  suscripcion_sede: { precioUsdCentavos: 150_00, periodo: "mensual" }, // 150 USD
  suscripcion_particular: { precioUsdCentavos: 10_00, periodo: "mensual" }, // 10 USD
};

// Máximo que admite la columna INTEGER de monto_en_centavos.
const MAX_CENTAVOS = 2_147_483_647;

// Valida USD_COP_TASA: número positivo con hasta 4 decimales (p. ej. "4000"
// o "4012.35"). Devuelve el texto normalizado, o null si falta o es inválida.
// Se guarda como texto/decimal para no arrastrar errores de coma flotante.
export function parseTasaUsdCop(raw: string | undefined): string | null {
  const valor = raw?.trim();
  if (!valor || !/^\d{1,8}(\.\d{1,4})?$/.test(valor)) return null;
  if (!(Number(valor) > 0)) return null;
  // Quita ceros a la izquierda sin perder los decimales ("04000.50" → "4000.50").
  return valor.replace(/^0+(?=\d)/, "");
}

// Importe en centavos COP = centavos USD × tasa, redondeado al centavo.
// Devuelve null si el resultado no es un importe válido para Wompi.
export function calcularMontoCopCentavos(
  precioUsdCentavos: number,
  tasaUsdCop: string
): number | null {
  const monto = Math.round(precioUsdCentavos * Number(tasaUsdCop));
  if (!Number.isSafeInteger(monto) || monto <= 0 || monto > MAX_CENTAVOS) {
    return null;
  }
  return monto;
}
