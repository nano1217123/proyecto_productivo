// Tipos del módulo de pagos.

// Planes que se pueden pagar. El backend decide el plan según el rol:
// - admin              → suscripcion_sede (paga la sede que administra)
// - usuario_particular → suscripcion_particular (paga su propia cuenta)
export const PLANES_SUSCRIPCION = [
  "suscripcion_sede",
  "suscripcion_particular",
] as const;

export type PlanSuscripcion = (typeof PLANES_SUSCRIPCION)[number];

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
  usuarioId: string;
  gymSlug: string | null;
  montoEnCentavos: number;
  moneda: typeof MONEDA_PAGOS;
}

// Intento de pago tal como se expone al cliente.
export interface PagoIntentoOutput {
  referencia: string;
  plan: PlanSuscripcion;
  gym_slug: string | null;
  monto_en_centavos: number;
  moneda: string;
  estado: string;
  creado_en: Date;
}

// Opción de pago disponible para el usuario autenticado.
export interface OpcionPago {
  plan: PlanSuscripcion;
  gym_slug: string | null;
  monto_en_centavos: number | null;
  moneda: typeof MONEDA_PAGOS;
  disponible: boolean;
}
