import { AppError } from "../errors/AppError.js";
import { wompiConfig, type WompiConfig } from "../config/wompi.js";
import {
  calcularFirmaIntegridad,
  construirUrlCheckout,
  generarReferenciaPago,
} from "../lib/wompi.js";
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

// Roles que pueden iniciar pagos. cliente y super_admin quedan fuera.
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
    // Opciones que el usuario autenticado puede pagar.
    async listarOpciones(usuarioId: string, rol: TipoUsuario): Promise<OpcionPago[]> {
      const rolPagador = exigirRolPagador(rol);
      const plan = planDelRol(rolPagador);
      const monto = config.montosEnCentavos[plan];
      const disponible =
        monto !== null && Boolean(config.publicKey && config.integritySecret);

      const crearOpcion = (gymSlug: string | null): OpcionPago => ({
        plan,
        gym_slug: gymSlug,
        monto_en_centavos: monto,
        moneda: MONEDA_PAGOS,
        disponible,
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

      const montoEnCentavos = config.montosEnCentavos[plan];
      if (!config.publicKey || !config.integritySecret || montoEnCentavos === null) {
        throw new AppError(503, "Los pagos no están disponibles en este momento.");
      }

      const referencia = generarReferencia();

      const pago = await repository.crearIntento({
        referencia,
        plan,
        usuarioId,
        gymSlug,
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
