import { AppError } from "../errors/AppError.js";
import { wompiConfig, type WompiConfig } from "../config/wompi.js";
import {
  ESTADO_POR_STATUS_WOMPI,
  calcularFirmaIntegridad,
  construirUrlCheckout,
  crearConsultaTransaccionWompi,
  generarReferenciaPago,
  parseTransaccionWompi,
  redirectConReferencia,
  verificarFirmaEvento,
  type ConsultarTransaccionWompi,
} from "../lib/wompi.js";
import {
  CATALOGO_PLANES,
  calcularMontoCopCentavos,
  parseTasaUsdCop,
} from "../lib/pagosPrecios.js";
import {
  pagosRepository,
  type PagosRepository,
} from "../repositories/pagos.repository.js";
import {
  MONEDA_PAGOS,
  type ConsultaEstadoPagoInput,
  type EstadoPago,
  type EventoWompi,
  type IniciarPagoInput,
  type ResultadoWebhookWompi,
  type TransaccionWompi,
  type OpcionPago,
  type PagoIntentoOutput,
  type PlanSuscripcion,
} from "../types/pagos.types.js";
import type { TipoUsuario } from "../types/usuario.types.js";

// Roles que pueden iniciar pagos. cliente (paga directamente al gimnasio)
// y super_admin (administra la plataforma) quedan fuera.
export const ROLES_PAGADORES = ["admin", "usuario_particular"] as const satisfies
  readonly TipoUsuario[];

type RolPagador = (typeof ROLES_PAGADORES)[number];

function esRolPagador(rol: TipoUsuario): rol is RolPagador {
  return (ROLES_PAGADORES as readonly TipoUsuario[]).includes(rol);
}

// El plan lo decide el backend a partir del rol, nunca el cliente.
function planDelRol(rol: RolPagador): PlanSuscripcion {
  return rol === "admin" ? "suscripcion_sede" : "suscripcion_particular";
}

const MSG_TASA_INVALIDA =
  "No se puede calcular el importe en COP: la tasa de cambio no está configurada o no es válida. Inténtalo más tarde.";
const MSG_PASARELA_NO_CONFIGURADA =
  "Los pagos no están disponibles en este momento: la pasarela no está configurada.";

// Precio del plan con la tasa vigente. Una única fuente de cálculo:
// centavos USD del catálogo × USD_COP_TASA.
type Cotizacion =
  | { ok: true; precioUsdCentavos: number; tasaUsdCop: string; montoEnCentavos: number }
  | { ok: false; precioUsdCentavos: number; tasaUsdCop: string | null; motivo: string };

function cotizar(plan: PlanSuscripcion, config: WompiConfig): Cotizacion {
  const { precioUsdCentavos } = CATALOGO_PLANES[plan];
  const tasaUsdCop = parseTasaUsdCop(config.tasaUsdCop);
  if (!tasaUsdCop) {
    return { ok: false, precioUsdCentavos, tasaUsdCop: null, motivo: MSG_TASA_INVALIDA };
  }
  const montoEnCentavos = calcularMontoCopCentavos(precioUsdCentavos, tasaUsdCop);
  if (montoEnCentavos === null) {
    return { ok: false, precioUsdCentavos, tasaUsdCop, motivo: MSG_TASA_INVALIDA };
  }
  if (!config.publicKey || !config.integritySecret) {
    return { ok: false, precioUsdCentavos, tasaUsdCop, motivo: MSG_PASARELA_NO_CONFIGURADA };
  }
  return { ok: true, precioUsdCentavos, tasaUsdCop, montoEnCentavos };
}

export interface CheckoutWompiOutput {
  pago: PagoIntentoOutput;
  checkoutUrl: string;
}

// Transiciones permitidas: estado nuevo → estados desde los que se admite.
// APROBADO, RECHAZADO y ERROR son finales; solo un pago aprobado puede
// anularse después (VOIDED, pagos con tarjeta). Nada vuelve a PENDIENTE.
const ESTADOS_PREVIOS: Record<EstadoPago, readonly EstadoPago[]> = {
  PENDIENTE: ["PENDIENTE"],
  APROBADO: ["PENDIENTE"],
  RECHAZADO: ["PENDIENTE"],
  ERROR: ["PENDIENTE"],
  ANULADO: ["PENDIENTE", "APROBADO"],
};

// Este paso solo admite Sandbox: environment "test" en los eventos.
const AMBIENTE_WOMPI = "test";

const MSG_WEBHOOK_NO_CONFIGURADO =
  "El webhook de pagos no está configurado.";

export function createPagosService(
  repository: PagosRepository = pagosRepository,
  config: WompiConfig = wompiConfig,
  generarReferencia: () => string = generarReferenciaPago,
  consultarTransaccion: ConsultarTransaccionWompi = crearConsultaTransaccionWompi({
    apiUrl: config.apiUrl,
    privateKey: config.privateKey,
  })
) {
  function exigirRolPagador(rol: TipoUsuario): RolPagador {
    if (!esRolPagador(rol)) {
      throw new AppError(403, "Tu rol no puede realizar pagos de suscripción.");
    }
    return rol;
  }

  return {
    // Opciones que el usuario autenticado puede pagar, con el importe COP
    // calculado con la tasa vigente.
    async listarOpciones(usuarioId: string, rol: TipoUsuario): Promise<OpcionPago[]> {
      const rolPagador = exigirRolPagador(rol);
      const plan = planDelRol(rolPagador);
      const cotizacion = cotizar(plan, config);

      const crearOpcion = (gymSlug: string | null): OpcionPago => ({
        plan,
        periodo: CATALOGO_PLANES[plan].periodo,
        gym_slug: gymSlug,
        precio_usd_centavos: cotizacion.precioUsdCentavos,
        tasa_usd_cop: cotizacion.tasaUsdCop,
        monto_en_centavos: cotizacion.ok ? cotizacion.montoEnCentavos : null,
        moneda: MONEDA_PAGOS,
        disponible: cotizacion.ok,
        motivo_no_disponible: cotizacion.ok ? null : cotizacion.motivo,
      });

      if (rolPagador === "admin") {
        const sedes = await repository.findSedesAdministradas(usuarioId);
        return sedes.map(crearOpcion);
      }
      return [crearOpcion(null)];
    },

    // Crea el intento de pago y devuelve la URL firmada del checkout de Wompi.
    async iniciarCheckoutWompi(
      usuarioId: string,
      correo: string | undefined,
      rol: TipoUsuario,
      input: IniciarPagoInput
    ): Promise<CheckoutWompiOutput> {
      const rolPagador = exigirRolPagador(rol);
      const plan = planDelRol(rolPagador);

      let gymSlug: string | null = null;

      if (rolPagador === "admin") {
        if (!input.gymSlug) {
          throw new AppError(400, "Selecciona la sede que quieres pagar.");
        }
        const autorizado = await repository.administraSede(usuarioId, input.gymSlug);
        if (!autorizado) {
          throw new AppError(403, "No tienes permiso para pagar la suscripción de esta sede.");
        }
        gymSlug = input.gymSlug;
      } else if (input.gymSlug) {
        // El usuario particular paga su propia cuenta, no una sede.
        throw new AppError(400, "Tu suscripción es personal: no debes indicar una sede.");
      }

      // Se cotiza antes de crear nada: con una tasa inválida no se guarda
      // ningún intento.
      const cotizacion = cotizar(plan, config);
      if (!cotizacion.ok) {
        console.error(`Checkout no disponible (${plan}): ${cotizacion.motivo}`);
        throw new AppError(503, cotizacion.motivo);
      }
      const { precioUsdCentavos, tasaUsdCop, montoEnCentavos } = cotizacion;

      // El usuario confirmó un importe concreto. Si la tasa cambió desde
      // que lo vio, no se crea el intento: debe revisar el nuevo importe.
      if (input.montoEnCentavos !== null && input.montoEnCentavos !== montoEnCentavos) {
        throw new AppError(
          409,
          "El importe a pagar cambió. Revisa el nuevo valor antes de continuar."
        );
      }

      const referencia = generarReferencia();

      // El intento conserva el precio USD, la tasa aplicada y el importe
      // final: cambios posteriores de la tasa no lo afectan.
      const pago = await repository.crearIntento({
        referencia,
        plan,
        periodo: CATALOGO_PLANES[plan].periodo,
        usuarioId,
        gymSlug,
        precioUsdCentavos,
        tasaUsdCop,
        montoEnCentavos,
        moneda: MONEDA_PAGOS,
      });

      const firma = calcularFirmaIntegridad({
        referencia,
        montoEnCentavos,
        moneda: MONEDA_PAGOS,
        secretoIntegridad: config.integritySecret,
      });

      const checkoutUrl = construirUrlCheckout({
        checkoutUrl: config.checkoutUrl,
        publicKey: config.publicKey,
        referencia,
        montoEnCentavos,
        moneda: MONEDA_PAGOS,
        firma,
        redirectUrl: config.redirectUrl
          ? redirectConReferencia(config.redirectUrl, referencia)
          : undefined,
        correoCliente: correo,
      });

      return { pago, checkoutUrl };
    },

    // Estado de un intento de pago, tal como lo dejó el webhook. Solo lo ve
    // quien puede pagarlo:
    // - usuario_particular: sus propios pagos de suscripción personal.
    // - admin: pagos de sedes que tiene asignadas hoy.
    // Si no existe o no le pertenece, responde 404 (no revela si existe).
    async consultarEstadoPago(
      usuarioId: string,
      rol: TipoUsuario,
      consulta: ConsultaEstadoPagoInput
    ): Promise<PagoIntentoOutput> {
      const rolPagador = exigirRolPagador(rol);
      const noEncontrado = () => new AppError(404, "No encontramos ese pago en tu cuenta.");

      const encontrado = await repository.findIntentoConsultable(consulta);
      if (!encontrado) throw noEncontrado();
      const { pago } = encontrado;

      if (rolPagador === "usuario_particular") {
        if (pago.plan !== "suscripcion_particular" || encontrado.usuarioId !== usuarioId) {
          throw noEncontrado();
        }
        return pago;
      }

      if (
        pago.plan !== "suscripcion_sede" ||
        !pago.gym_slug ||
        !(await repository.administraSede(usuarioId, pago.gym_slug))
      ) {
        throw noEncontrado();
      }
      return pago;
    },

    // Procesa un evento del webhook de Wompi. Solo actualiza el intento de
    // pago; la activación de la suscripción queda para el siguiente paso.
    // Lanza AppError (respuesta distinta de 200, Wompi reintenta) cuando el
    // evento no es válido o no se pudo verificar.
    async procesarEventoWompi(
      evento: EventoWompi,
      checksumCabecera?: string
    ): Promise<ResultadoWebhookWompi> {
      // 1. Sin secreto de eventos no se acepta ningún evento.
      if (!config.eventsSecret) {
        console.error("Webhook de Wompi rechazado: falta WOMPI_EVENTS_SECRET.");
        throw new AppError(503, MSG_WEBHOOK_NO_CONFIGURADO);
      }

      // 2. Firma.
      if (!verificarFirmaEvento(evento, config.eventsSecret, checksumCabecera)) {
        console.warn("Webhook de Wompi rechazado: firma inválida.");
        throw new AppError(401, "Firma del evento inválida.");
      }

      // 3. Solo se procesan cambios de transacción; el resto se confirma
      //    con 200 para que Wompi no los reintente.
      if (evento.event !== "transaction.updated") {
        return { resultado: "ignorado" };
      }

      if (evento.environment !== AMBIENTE_WOMPI) {
        console.warn(`Webhook de Wompi rechazado: ambiente "${evento.environment}".`);
        throw new AppError(422, "El evento no corresponde al ambiente configurado.");
      }

      const delEvento = parseTransaccionWompi(evento.data.transaction);
      if (!delEvento) {
        throw new AppError(400, "El evento no tiene el formato esperado.");
      }

      // 4. Intento guardado y comparación con los datos del evento. Se usa
      //    el importe original del intento: no se recalcula con la tasa.
      const intento = await repository.findIntentoPorReferencia(delEvento.reference);
      if (!intento) {
        console.warn(`Webhook de Wompi: referencia desconocida ${delEvento.reference}.`);
        throw new AppError(404, "Pago no encontrado.");
      }
      if (
        delEvento.currency !== intento.moneda ||
        delEvento.amountInCents !== intento.montoEnCentavos
      ) {
        console.warn(
          `Webhook de Wompi: importe o moneda no coinciden (${intento.referencia}).`
        );
        throw new AppError(409, "El importe o la moneda no coinciden con el pago.");
      }
      if (intento.wompiTransaccionId && intento.wompiTransaccionId !== delEvento.id) {
        console.warn(`Webhook de Wompi: transacción distinta para ${intento.referencia}.`);
        throw new AppError(409, "El pago ya está asociado a otra transacción.");
      }

      // 5. Verificación del lado del servidor con la API de Wompi.
      if (!config.privateKey) {
        console.error("Webhook de Wompi rechazado: falta WOMPI_PRIVATE_KEY.");
        throw new AppError(503, MSG_WEBHOOK_NO_CONFIGURADO);
      }
      let verificada: TransaccionWompi | null;
      try {
        verificada = await consultarTransaccion(delEvento.id);
      } catch (error) {
        console.error("No se pudo verificar la transacción con Wompi:", error);
        throw new AppError(502, "No se pudo verificar la transacción con Wompi.");
      }
      if (
        !verificada ||
        verificada.id !== delEvento.id ||
        verificada.reference !== intento.referencia ||
        verificada.currency !== intento.moneda ||
        verificada.amountInCents !== intento.montoEnCentavos
      ) {
        console.warn(
          `Webhook de Wompi: la transacción verificada no coincide (${intento.referencia}).`
        );
        throw new AppError(409, "La transacción no coincide con el pago.");
      }

      // 6. Se aplica el estado consultado a Wompi, no el del evento.
      const estado = ESTADO_POR_STATUS_WOMPI[verificada.status];
      const aplicado = await repository.aplicarEstadoWompi({
        pagoId: intento.id,
        transaccionId: verificada.id,
        estado,
        estadosPrevios: ESTADOS_PREVIOS[estado],
        eventoEn: new Date(evento.timestamp * 1000),
      });
      if (aplicado) {
        return { resultado: "aplicado", referencia: intento.referencia, estado };
      }

      // Sin cambios: evento repetido, antiguo o transición no permitida.
      // Se relee el estado para distinguir el duplicado.
      const actual = await repository.findIntentoPorReferencia(intento.referencia);
      if (actual?.wompiTransaccionId && actual.wompiTransaccionId !== verificada.id) {
        throw new AppError(409, "El pago ya está asociado a otra transacción.");
      }
      const duplicado = actual?.estado === estado;
      return {
        resultado: duplicado ? "duplicado" : "ignorado",
        referencia: intento.referencia,
        estado: actual?.estado,
      };
    },
  };
}

export type PagosService = ReturnType<typeof createPagosService>;

export const pagosService = createPagosService();
