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

// Estados del intento de pago. Equivalen a los estados de la transacción
// en Wompi (ver ESTADO_POR_STATUS_WOMPI en lib/wompi.ts).
export const ESTADOS_PAGO = [
  "PENDIENTE",
  "APROBADO",
  "RECHAZADO",
  "ANULADO",
  "ERROR",
] as const;

export type EstadoPago = (typeof ESTADOS_PAGO)[number];

// Estados de una transacción en Wompi.
export const STATUS_TRANSACCION_WOMPI = [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "VOIDED",
  "ERROR",
] as const;

export type StatusTransaccionWompi = (typeof STATUS_TRANSACCION_WOMPI)[number];

// Campos de una transacción de Wompi que usa el webhook, tanto los del
// evento como los de la consulta GET /v1/transactions/{id}.
// finalizadaEn (finalized_at) solo viene cuando la transacción terminó.
export interface TransaccionWompi {
  id: string;
  reference: string;
  status: StatusTransaccionWompi;
  amountInCents: number;
  currency: string;
  finalizadaEn?: Date;
}

// Evento con la forma validada (la firma se verifica aparte).
export interface EventoWompi {
  event: string;
  data: Record<string, unknown>;
  environment: string;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
}

// Intento de pago tal como lo necesita el webhook.
export interface PagoIntentoWebhook {
  id: string;
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  estado: EstadoPago;
  wompiTransaccionId: string | null;
  wompiEventoEn: Date | null;
}

// Cambio de estado que el webhook aplica de forma condicional.
export interface AplicarEstadoWompiInput {
  pagoId: string;
  transaccionId: string;
  estado: EstadoPago;
  // Estados desde los que se permite pasar a `estado`.
  estadosPrevios: readonly EstadoPago[];
  eventoEn: Date;
}

// Aprobación posterior con otra transacción de la misma referencia
// (reintento de pago): solo se aplica si el intento sigue en uno de
// `estadosPrevios` con `transaccionIdAnterior`.
export interface RecuperarAprobacionWompiInput {
  pagoId: string;
  transaccionIdAnterior: string;
  estadosPrevios: readonly EstadoPago[];
  transaccionId: string;
  eventoEn: Date;
}

// Respuesta del webhook cuando el evento se acepta (HTTP 200):
// - aplicado:  el intento cambió de estado.
// - duplicado: el intento ya tenía ese estado y esa transacción.
// - ignorado:  evento no procesado (otro tipo de evento, evento antiguo o
//              transición no permitida). Responder 200 evita reintentos.
export interface ResultadoWebhookWompi {
  resultado: "aplicado" | "duplicado" | "ignorado";
  referencia?: string;
  estado?: EstadoPago;
}

// Body ya validado de POST /api/pagos/wompi/checkout.
// montoEnCentavos es el importe COP que el usuario vio y confirmó. Si no
// coincide con la cotización vigente, no se crea el intento (409).
export interface IniciarPagoInput {
  gymSlug: string | null;
  montoEnCentavos: number | null;
}

// Query ya validada de GET /api/pagos/estado. Identifica el intento por su
// referencia (la que el backend añade a redirect-url) o, si falta, por el
// id de transacción que Wompi añade al volver (?id=). Al menos uno viene
// definido.
export interface ConsultaEstadoPagoInput {
  referencia: string | null;
  transaccionId: string | null;
}

// Body ya validado de POST /api/pagos/conciliar.
export interface ConciliarPagoInput {
  referencia: string;
}

// Resultado de la conciliación con la API de Wompi:
// - aplicado:     el intento cambió de estado con la transacción verificada.
// - sin_cambios:  se consultó a Wompi y no había nada nuevo que aplicar
//                 (sin transacción final, o el estado ya estaba guardado).
// - no_necesaria: el intento ya tenía un estado final; no se consultó.
// - en_espera:    se consultó hace muy poco; no se volvió a consultar.
export interface ResultadoConciliacionPago {
  pago: PagoIntentoOutput;
  conciliacion: "aplicado" | "sin_cambios" | "no_necesaria" | "en_espera";
}

// Intento con los datos necesarios para decidir quién puede consultarlo.
export interface PagoIntentoConsultable {
  usuarioId: string;
  pago: PagoIntentoOutput;
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
  actualizado_en: Date;
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
