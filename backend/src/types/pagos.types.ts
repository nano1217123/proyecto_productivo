// Tipos del módulo de pagos.

// Planes que se pueden pagar. El backend decide el plan según el rol:
// - admin              → suscripcion_sede (paga la sede que administra)
// - usuario_particular → suscripcion_particular (paga su propia cuenta)
export const PLANES_SUSCRIPCION = [
  "suscripcion_sede",
  "suscripcion_particular",
] as const;

export type PlanSuscripcion = (typeof PLANES_SUSCRIPCION)[number];

// Por ahora solo hay plan mensual.
export type PeriodoSuscripcion = "mensual";

// Wompi Colombia solo acepta COP.
export const MONEDA_PAGOS = "COP" as const;

export type EstadoPago = "PENDIENTE";

// Body ya validado de POST /api/pagos/wompi/checkout.
export interface IniciarPagoInput {
  gymSlug: string | null;
}

// Datos que se guardan al crear un intento de pago.
export interface NuevoPagoIntento {
  referencia: string;
  plan: PlanSuscripcion;
  periodo: PeriodoSuscripcion;
  usuarioId: string;
  gymSlug: string | null;
  precioUsdCentavos: number;
  tasaUsdCop: string;
  montoEnCentavos: number;
  moneda: typeof MONEDA_PAGOS;
}

// Intento de pago tal como se expone al cliente.
// precio_usd_centavos y tasa_usd_cop son null en intentos anteriores a la
// conversión desde USD (se crearon con importes fijos en COP).
export interface PagoIntentoOutput {
  referencia: string;
  plan: PlanSuscripcion;
  periodo: string;
  gym_slug: string | null;
  precio_usd_centavos: number | null;
  tasa_usd_cop: string | null;
  monto_en_centavos: number;
  moneda: string;
  estado: string;
  creado_en: Date;
}

// Opción de pago disponible para el usuario autenticado.
export interface OpcionPago {
  plan: PlanSuscripcion;
  periodo: PeriodoSuscripcion;
  gym_slug: string | null;
  precio_usd_centavos: number;
  tasa_usd_cop: string | null;
  monto_en_centavos: number | null;
  moneda: typeof MONEDA_PAGOS;
  disponible: boolean;
  motivo_no_disponible: string | null;
}
