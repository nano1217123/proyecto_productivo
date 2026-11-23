import { AppError } from "../errors/AppError.js";
import { wompiConfig, type WompiConfig } from "../config/wompi.js";
import {
  calcularFirmaIntegridad,
  construirUrlCheckout,
  generarReferenciaPago,
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
  type IniciarPagoInput,
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

export function createPagosService(
  repository: PagosRepository = pagosRepository,
  config: WompiConfig = wompiConfig,
  generarReferencia: () => string = generarReferenciaPago
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
        redirectUrl: config.redirectUrl,
        correoCliente: correo,
      });

      return { pago, checkoutUrl };
    },
  };
}

export type PagosService = ReturnType<typeof createPagosService>;

export const pagosService = createPagosService();
