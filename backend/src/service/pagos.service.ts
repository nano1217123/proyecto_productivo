import { AppError } from "../errors/AppError.js";
import { wompiConfig, type WompiConfig } from "../config/wompi.js";
import {
  ESTADO_POR_STATUS_WOMPI,
  calcularFirmaIntegridad,
  construirUrlCheckout,
  crearBusquedaTransaccionesWompi,
  crearConsultaTransaccionWompi,
  generarReferenciaPago,
  parseTransaccionWompi,
  redirectConReferencia,
  verificarFirmaEvento,
  type BuscarTransaccionesWompi,
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
  type ConciliarPagoInput,
  type ConsultaEstadoPagoInput,
  type PagoIntentoWebhook,
  type ResultadoConciliacionPago,
  type EstadoPago,
  type EventoWompi,
  type IniciarPagoInput,
  type ResultadoWebhookWompi,
  type TransaccionWompi,
  type OpcionPago,
  type PagoIntentoOutput,
  type PlanSuscripcion,
  type ResultadoAplicacionWompi,
} from "../types/pagos.types.js";
import { estadoSuscripcionSede } from "../lib/suscripcionSede.js";
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

// Estados desde los que se puede recuperar una aprobación posterior con
// otra transacción de la misma referencia (reintento de pago en Wompi).
const ESTADOS_RECUPERABLES = ["RECHAZADO", "ERROR"] as const satisfies readonly EstadoPago[];

function esEstadoRecuperable(estado: EstadoPago): boolean {
  return (ESTADOS_RECUPERABLES as readonly EstadoPago[]).includes(estado);
}

// Estados que se pueden conciliar con Wompi: el pendiente, y los fallidos
// por si el pagador reintentó y Wompi aprobó otra transacción.
const ESTADOS_CONCILIABLES: readonly EstadoPago[] = ["PENDIENTE", ...ESTADOS_RECUPERABLES];

const MSG_WEBHOOK_NO_CONFIGURADO =
  "El webhook de pagos no está configurado.";
const MSG_CONCILIACION_NO_CONFIGURADA =
  "No se puede verificar el pago con Wompi en este momento.";
const MSG_PAGO_NO_ENCONTRADO = "No encontramos ese pago en tu cuenta.";

// Tiempo mínimo entre dos consultas de conciliación a Wompi del mismo intento.
export const ESPERA_CONCILIACION_MS = 20_000;

export function createPagosService(
  repository: PagosRepository = pagosRepository,
  config: WompiConfig = wompiConfig,
  generarReferencia: () => string = generarReferenciaPago,
  consultarTransaccion: ConsultarTransaccionWompi = crearConsultaTransaccionWompi({
    apiUrl: config.apiUrl,
    privateKey: config.privateKey,
  }),
  buscarTransacciones: BuscarTransaccionesWompi = crearBusquedaTransaccionesWompi({
    apiUrl: config.apiUrl,
    privateKey: config.privateKey,
  }),
  ahora: () => number = Date.now
) {
  function exigirRolPagador(rol: TipoUsuario): RolPagador {
    if (!esRolPagador(rol)) {
      throw new AppError(403, "Tu rol no puede realizar pagos de suscripción.");
    }
    return rol;
  }

  // Intento que el usuario puede consultar:
  // - usuario_particular: sus propios pagos de suscripción personal.
  // - admin: pagos de sedes que tiene asignadas hoy.
  // Si no existe o no le pertenece, 404 (no revela si existe).
  async function buscarIntentoAutorizado(
    usuarioId: string,
    rol: TipoUsuario,
    consulta: ConsultaEstadoPagoInput
  ): Promise<PagoIntentoOutput> {
    const rolPagador = exigirRolPagador(rol);
    const noEncontrado = () => new AppError(404, MSG_PAGO_NO_ENCONTRADO);

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
  }

  // Añade a un pago de sede el estado actual de la suscripción de esa sede
  // y el período que concedió el pago. Los pagos particulares no cambian.
  async function conVigencia(pago: PagoIntentoOutput): Promise<PagoIntentoOutput> {
    if (pago.plan !== "suscripcion_sede" || !pago.gym_slug) return pago;
    const vigencia = await repository.findVigenciaDePago(pago.referencia);
    const vigenteHasta = vigencia?.vigenteHasta ?? null;
    return {
      ...pago,
      suscripcion: {
        gym_slug: pago.gym_slug,
        estado: estadoSuscripcionSede(vigenteHasta, new Date(ahora())),
        vigente_hasta: vigenteHasta,
        periodo_pago: vigencia?.periodo ?? null,
      },
    };
  }

  // Verifica una transacción con la API de Wompi y aplica su estado al
  // intento. Lo comparten el webhook y la conciliación:
  // - la transacción consultada por id debe tener la referencia, la moneda
  //   y el importe del intento (409);
  // - el estado que se aplica es el consultado a Wompi, nunca el recibido;
  // - la actualización es condicional, así que repetir un aviso no repite
  //   efectos. Ver aplicarTransaccionVerificada.
  async function verificarYAplicarTransaccion(
    intento: PagoIntentoWebhook,
    transaccionId: string,
    eventoEn: Date,
    origen: string
  ): Promise<ResultadoWebhookWompi> {
    if (!config.privateKey) {
      console.error(`${origen} rechazado: falta WOMPI_PRIVATE_KEY.`);
      throw new AppError(503, MSG_WEBHOOK_NO_CONFIGURADO);
    }
    // La API consultada es la del ambiente configurado: el intento debe
    // haberse creado en ese mismo ambiente.
    if (intento.ambiente !== config.ambiente) {
      console.warn(`${origen}: el intento ${intento.referencia} es del ambiente "${intento.ambiente}".`);
      throw new AppError(422, "El pago no corresponde al ambiente configurado.");
    }
    let verificada: TransaccionWompi | null;
    try {
      verificada = await consultarTransaccion(transaccionId);
    } catch (error) {
      console.error("No se pudo verificar la transacción con Wompi:", error);
      throw new AppError(502, "No se pudo verificar la transacción con Wompi.");
    }
    if (
      !verificada ||
      verificada.id !== transaccionId ||
      verificada.reference !== intento.referencia ||
      verificada.currency !== intento.moneda ||
      verificada.amountInCents !== intento.montoEnCentavos
    ) {
      console.warn(
        `${origen}: la transacción verificada no coincide (${intento.referencia}).`
      );
      throw new AppError(409, "La transacción no coincide con el pago.");
    }

    return aplicarTransaccionVerificada(intento, verificada, eventoEn, origen, false);
  }

  // Aplica una transacción ya verificada con Wompi.
  //
  // Misma transacción que la guardada (o ninguna guardada): UPDATE
  // condicional por estados previos, transacción y fecha.
  //
  // Transacción distinta de la guardada (Wompi permite reintentar el pago
  // con la misma referencia: una rechazada y luego otra aprobada):
  // - intento RECHAZADO o ERROR y la nueva está APPROVED → se recupera la
  //   aprobación con un UPDATE condicional al estado y al ID previos;
  // - la nueva no está aprobada (p. ej. el aviso tardío del rechazo
  //   anterior) → 200 «ignorado», no cambia nada;
  // - intento ya APROBADO (o ANULADO) y la nueva también APPROVED → posible
  //   cobro doble: se conserva el ID aprobado, alerta y 409;
  // - intento PENDIENTE con otra transacción registrada → 409, como antes.
  //
  // Si el UPDATE no cambia la fila (otra solicitud ganó la carrera), se
  // relee el intento y se clasifica de nuevo una sola vez.
  async function aplicarTransaccionVerificada(
    intento: PagoIntentoWebhook,
    verificada: TransaccionWompi,
    eventoEn: Date,
    origen: string,
    esReintento: boolean
  ): Promise<ResultadoWebhookWompi> {
    const estado = ESTADO_POR_STATUS_WOMPI[verificada.status];
    const previa = intento.wompiTransaccionId;
    // Momento de aprobación según Wompi (verificado con la API). La vigencia
    // de una sede cuenta desde aquí o desde su vencimiento actual.
    const aprobadoEn = verificada.finalizadaEn ?? new Date(ahora());
    let resultado: ResultadoAplicacionWompi;

    if (!previa || previa === verificada.id) {
      resultado = await repository.aplicarEstadoWompi({
        pagoId: intento.id,
        transaccionId: verificada.id,
        estado,
        estadosPrevios: ESTADOS_PREVIOS[estado],
        eventoEn,
        aprobadoEn,
      });
    } else if (verificada.status === "APPROVED" && esEstadoRecuperable(intento.estado)) {
      resultado = await repository.recuperarAprobacionWompi({
        pagoId: intento.id,
        transaccionIdAnterior: previa,
        estadosPrevios: ESTADOS_RECUPERABLES,
        transaccionId: verificada.id,
        eventoEn,
        aprobadoEn,
      });
      if (resultado.aplicado) {
        console.info(
          `${origen}: aprobación recuperada para ${intento.referencia} (${intento.estado} con ${previa} → APROBADO con ${verificada.id}).`
        );
      }
    } else if (verificada.status !== "APPROVED" && intento.estado !== "PENDIENTE") {
      console.info(
        `${origen}: transacción ${verificada.id} (${verificada.status}) ignorada; ${intento.referencia} sigue ${intento.estado} con ${previa}.`
      );
      return { resultado: "ignorado", referencia: intento.referencia, estado: intento.estado };
    } else if (verificada.status === "APPROVED" && intento.estado !== "PENDIENTE") {
      // Posible cobro doble: se guarda la evidencia y no se concede un
      // segundo período por este intento.
      await repository.registrarTransaccionEnRevision({
        pagoId: intento.id,
        transaccionId: verificada.id,
        transaccionAplicadaId: previa,
        motivo: "segunda_aprobacion",
        origen,
      });
      console.error(
        `[ALERTA PAGOS] ${origen}: segunda aprobación ${verificada.id} para ${intento.referencia}, ya ${intento.estado} con ${previa}. Se conserva ${previa}; revisar posible cobro doble.`
      );
      throw new AppError(409, "El pago ya está aprobado con otra transacción.");
    } else {
      console.warn(`${origen}: transacción distinta para ${intento.referencia}.`);
      throw new AppError(409, "El pago ya está asociado a otra transacción.");
    }

    if (resultado.aplicado) {
      if (resultado.periodo) {
        console.info(
          `${origen}: ${intento.referencia} concede a ${intento.gymSlug} un período (${resultado.periodo.tipo}) hasta ${resultado.periodo.hasta.toISOString()}.`
        );
      }
      return { resultado: "aplicado", referencia: intento.referencia, estado };
    }

    // Sin cambios: aviso repetido, antiguo, transición no permitida u otra
    // solicitud que ganó la carrera. Se relee el intento para clasificarlo.
    const actual = await repository.findIntentoPorReferencia(intento.referencia);
    if (!actual) throw new AppError(404, "Pago no encontrado.");
    if (actual.wompiTransaccionId === verificada.id) {
      return {
        resultado: actual.estado === estado ? "duplicado" : "ignorado",
        referencia: intento.referencia,
        estado: actual.estado,
      };
    }
    if (!esReintento) {
      return aplicarTransaccionVerificada(actual, verificada, eventoEn, origen, true);
    }
    return { resultado: "ignorado", referencia: intento.referencia, estado: actual.estado };
  }

  // Última consulta de conciliación a Wompi por referencia (en memoria del
  // proceso). Se limpian las entradas que ya no frenan nada.
  const ultimaConciliacion = new Map<string, number>();
  function limpiarConciliacionesAntiguas(momento: number) {
    if (ultimaConciliacion.size < 1000) return;
    for (const [referencia, en] of ultimaConciliacion) {
      if (momento - en >= ESPERA_CONCILIACION_MS) ultimaConciliacion.delete(referencia);
    }
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
        // Una opción por sede autorizada, con el estado de su suscripción.
        const sedes = await repository.findSedesAdministradas(usuarioId);
        const vigencias = await repository.findSuscripcionesSede(sedes);
        const momento = new Date(ahora());
        return sedes.map((gymSlug) => {
          const vigenteHasta = vigencias.get(gymSlug) ?? null;
          return {
            ...crearOpcion(gymSlug),
            suscripcion: {
              gym_slug: gymSlug,
              estado: estadoSuscripcionSede(vigenteHasta, momento),
              vigente_hasta: vigenteHasta,
            },
          };
        });
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
        ambiente: config.ambiente,
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
      return conVigencia(await buscarIntentoAutorizado(usuarioId, rol, consulta));
    },

    // Procesa un evento del webhook de Wompi. Actualiza el intento de pago y,
    // si un pago de sede queda APROBADO, le concede su período en la misma
    // transacción (ver aplicarTransaccionVerificada).
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

      if (evento.environment !== config.ambiente) {
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

      // 5 y 6. Verificación con la API de Wompi y actualización condicional.
      return verificarYAplicarTransaccion(
        intento,
        delEvento.id,
        new Date(evento.timestamp * 1000),
        "Webhook de Wompi"
      );
    },

    // Concilia un intento PENDIENTE, RECHAZADO o ERROR consultando a Wompi:
    // para cuando el evento del webhook no llegó, o cuando el pagador
    // reintentó y Wompi aprobó otra transacción con la misma referencia.
    // APROBADO y ANULADO no se concilian. Solo puede pedirla quien puede consultar
    // el intento (mismas reglas que consultarEstadoPago). Busca las
    // transacciones de la referencia, elige la que corresponde y la
    // verifica y aplica por el mismo camino que el webhook: repetirla, o
    // recibir después el evento, no produce efectos duplicados.
    async conciliarPago(
      usuarioId: string,
      rol: TipoUsuario,
      input: ConciliarPagoInput
    ): Promise<ResultadoConciliacionPago> {
      const consultable = await buscarIntentoAutorizado(usuarioId, rol, {
        referencia: input.referencia,
        transaccionId: null,
      });
      if (!ESTADOS_CONCILIABLES.includes(consultable.estado as EstadoPago)) {
        return { pago: await conVigencia(consultable), conciliacion: "no_necesaria" };
      }

      if (!config.privateKey) {
        console.error("Conciliación de Wompi no disponible: falta WOMPI_PRIVATE_KEY.");
        throw new AppError(503, MSG_CONCILIACION_NO_CONFIGURADA);
      }

      // Una consulta a Wompi por intento cada ESPERA_CONCILIACION_MS, sin
      // importar cuántas pestañas o usuarios la pidan.
      const momento = ahora();
      const anterior = ultimaConciliacion.get(consultable.referencia);
      if (anterior !== undefined && momento - anterior < ESPERA_CONCILIACION_MS) {
        return { pago: await conVigencia(consultable), conciliacion: "en_espera" };
      }
      ultimaConciliacion.set(consultable.referencia, momento);
      limpiarConciliacionesAntiguas(momento);

      const intento = await repository.findIntentoPorReferencia(consultable.referencia);
      if (!intento) throw new AppError(404, MSG_PAGO_NO_ENCONTRADO);

      let transacciones: TransaccionWompi[];
      try {
        transacciones = await buscarTransacciones(intento.referencia);
      } catch (error) {
        console.error("No se pudieron buscar las transacciones en Wompi:", error);
        throw new AppError(502, "No se pudo consultar el pago con Wompi. Inténtalo más tarde.");
      }

      const elegida = elegirTransaccionParaConciliar(intento, transacciones);
      if (!elegida) {
        return { pago: await conVigencia(consultable), conciliacion: "sin_cambios" };
      }

      const resultado = await verificarYAplicarTransaccion(
        intento,
        elegida.id,
        elegida.finalizadaEn ?? new Date(momento),
        "Conciliación de Wompi"
      );
      if (resultado.resultado === "aplicado") {
        console.info(
          `Conciliación de Wompi: ${intento.referencia} → ${resultado.estado} (transacción ${elegida.id}).`
        );
      }

      // Wompi listó más de una transacción aprobada para la referencia: las
      // que no quedaron asociadas al intento se guardan para revisión y no
      // conceden vigencia.
      const final = await repository.findIntentoPorReferencia(intento.referencia);
      const otrasAprobadas = transacciones.filter((t) =>
        t.status === "APPROVED" &&
        t.reference === intento.referencia &&
        t.currency === intento.moneda &&
        t.amountInCents === intento.montoEnCentavos &&
        final?.estado === "APROBADO" &&
        t.id !== final.wompiTransaccionId
      );
      for (const otra of otrasAprobadas) {
        await repository.registrarTransaccionEnRevision({
          pagoId: intento.id,
          transaccionId: otra.id,
          transaccionAplicadaId: final?.wompiTransaccionId ?? null,
          motivo: "segunda_aprobacion",
          origen: "Conciliación de Wompi",
        });
        console.error(
          `[ALERTA PAGOS] Conciliación de Wompi: segunda aprobación ${otra.id} para ${intento.referencia}; se conserva ${final?.wompiTransaccionId}. Revisar posible cobro doble.`
        );
      }

      const actualizado = await buscarIntentoAutorizado(usuarioId, rol, {
        referencia: intento.referencia,
        transaccionId: null,
      });
      return {
        pago: await conVigencia(actualizado),
        conciliacion: resultado.resultado === "aplicado" ? "aplicado" : "sin_cambios",
      };
    },
  };
}

// Elige la transacción de Wompi con la que conciliar un intento:
// - solo las de su referencia, moneda e importe (las demás se registran);
// - intento RECHAZADO o ERROR: solo una APPROVED (la del reintento de pago,
//   con otro ID); si no hay, no hay nada que conciliar;
// - intento PENDIENTE con transacción asociada: solo esa;
// - se prefiere una APPROVED; si no hay, la última finalizada
//   (DECLINED, VOIDED, ERROR). Las PENDING no cambian nada.
function elegirTransaccionParaConciliar(
  intento: PagoIntentoWebhook,
  transacciones: TransaccionWompi[]
): TransaccionWompi | null {
  const recuperable = esEstadoRecuperable(intento.estado);
  const candidatas = transacciones.filter((t) => {
    if (t.reference !== intento.referencia) return false;
    if (t.currency !== intento.moneda || t.amountInCents !== intento.montoEnCentavos) {
      console.warn(
        `Conciliación de Wompi: transacción ${t.id} con importe o moneda distintos (${intento.referencia}).`
      );
      return false;
    }
    if (recuperable) return t.status === "APPROVED";
    return !intento.wompiTransaccionId || t.id === intento.wompiTransaccionId;
  });
  const aprobada = candidatas.find((t) => t.status === "APPROVED");
  if (aprobada) return aprobada;
  if (recuperable) return null;
  const finalizadas = candidatas
    .filter((t) => t.status !== "PENDING")
    .sort((a, b) => (b.finalizadaEn?.getTime() ?? 0) - (a.finalizadaEn?.getTime() ?? 0));
  return finalizadas[0] ?? null;
}

export type PagosService = ReturnType<typeof createPagosService>;

export const pagosService = createPagosService();
