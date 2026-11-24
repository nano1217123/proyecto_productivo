// Repositorio del módulo de pagos.
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type {
  AplicarEstadoWompiInput,
  EstadoPago,
  NuevoPagoIntento,
  PagoIntentoConsultable,
  PagoIntentoWebhook,
  PagoIntentoOutput,
  PlanSuscripcion,
} from "../types/pagos.types.js";

// Campos del intento que se exponen al cliente.
const SELECT_SALIDA = {
  referencia: true,
  plan: true,
  periodo: true,
  gymSlug: true,
  precioUsdCentavos: true,
  tasaUsdCop: true,
  montoEnCentavos: true,
  moneda: true,
  estado: true,
  creadoEn: true,
  actualizadoEn: true,
} as const;

type FilaSalida = {
  referencia: string;
  plan: string;
  periodo: string;
  gymSlug: string | null;
  precioUsdCentavos: number | null;
  tasaUsdCop: { toString(): string } | null;
  montoEnCentavos: number;
  moneda: string;
  estado: string;
  creadoEn: Date;
  actualizadoEn: Date;
};

function aSalida(pago: FilaSalida): PagoIntentoOutput {
  return {
    referencia: pago.referencia,
    plan: pago.plan as PlanSuscripcion,
    periodo: pago.periodo,
    gym_slug: pago.gymSlug,
    precio_usd_centavos: pago.precioUsdCentavos,
    tasa_usd_cop: pago.tasaUsdCop?.toString() ?? null,
    monto_en_centavos: pago.montoEnCentavos,
    moneda: pago.moneda,
    estado: pago.estado,
    creado_en: pago.creadoEn,
    actualizado_en: pago.actualizadoEn,
  };
}

export function createPagosRepository() {
  return {
    // Sedes (gym_slug) asignadas a un administrador.
    async findSedesAdministradas(usuarioId: string): Promise<string[]> {
      try {
        const filas = await prisma.adminSede.findMany({
          where: { usuarioId },
          select: { gymSlug: true },
          orderBy: { gymSlug: "asc" },
        });
        return filas.map((fila) => fila.gymSlug);
      } catch (error) {
        console.error("Error al consultar las sedes del administrador:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // true si el usuario tiene asignada esa sede.
    async administraSede(usuarioId: string, gymSlug: string): Promise<boolean> {
      try {
        const fila = await prisma.adminSede.findUnique({
          where: { usuarioId_gymSlug: { usuarioId, gymSlug } },
          select: { id: true },
        });
        return fila !== null;
      } catch (error) {
        console.error("Error al verificar la sede del administrador:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // Guarda un intento de pago en estado PENDIENTE.
    async crearIntento(input: NuevoPagoIntento): Promise<PagoIntentoOutput> {
      try {
        const pago = await prisma.pagoIntento.create({
          data: {
            referencia: input.referencia,
            plan: input.plan,
            periodo: input.periodo,
            usuarioId: input.usuarioId,
            gymSlug: input.gymSlug,
            precioUsdCentavos: input.precioUsdCentavos,
            tasaUsdCop: input.tasaUsdCop,
            montoEnCentavos: input.montoEnCentavos,
            moneda: input.moneda,
            estado: "PENDIENTE",
          },
          select: SELECT_SALIDA,
        });
        return aSalida(pago);
      } catch (error) {
        console.error("Error al guardar el intento de pago:", error);
        throw new AppError(500, "No se pudo registrar el pago.");
      }
    },

    // Intento de pago para la consulta de estado: por referencia o, si no
    // viene, por el id de transacción de Wompi. Incluye el dueño para que
    // el servicio decida si el usuario puede verlo.
    async findIntentoConsultable(where: {
      referencia: string | null;
      transaccionId: string | null;
    }): Promise<PagoIntentoConsultable | null> {
      try {
        const pago = await prisma.pagoIntento.findUnique({
          where: where.referencia
            ? { referencia: where.referencia }
            : { wompiTransaccionId: where.transaccionId as string },
          select: { ...SELECT_SALIDA, usuarioId: true },
        });
        return pago ? { usuarioId: pago.usuarioId, pago: aSalida(pago) } : null;
      } catch (error) {
        console.error("Error al consultar el estado del pago:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // Intento de pago por referencia, con los campos que usa el webhook.
    async findIntentoPorReferencia(referencia: string): Promise<PagoIntentoWebhook | null> {
      try {
        const pago = await prisma.pagoIntento.findUnique({
          where: { referencia },
          select: {
            id: true,
            referencia: true,
            montoEnCentavos: true,
            moneda: true,
            estado: true,
            wompiTransaccionId: true,
            wompiEventoEn: true,
          },
        });
        return pago ? { ...pago, estado: pago.estado as EstadoPago } : null;
      } catch (error) {
        console.error("Error al consultar el intento de pago:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // Aplica el nuevo estado con un único UPDATE condicional, atómico frente
    // a eventos simultáneos: solo cambia la fila si
    // - su estado actual está en `estadosPrevios`,
    // - no tiene transacción o tiene esta misma, y
    // - no se aplicó antes un evento más reciente.
    // Devuelve true si la fila cambió.
    async aplicarEstadoWompi(input: AplicarEstadoWompiInput): Promise<boolean> {
      try {
        const { count } = await prisma.pagoIntento.updateMany({
          where: {
            id: input.pagoId,
            estado: { in: [...input.estadosPrevios] },
            AND: [
              // PENDIENTE → PENDIENTE solo sirve para registrar la transacción.
              input.estado === "PENDIENTE"
                ? { wompiTransaccionId: null }
                : {
                    OR: [
                      { wompiTransaccionId: null },
                      { wompiTransaccionId: input.transaccionId },
                    ],
                  },
              {
                OR: [
                  { wompiEventoEn: null },
                  { wompiEventoEn: { lte: input.eventoEn } },
                ],
              },
            ],
          },
          data: {
            estado: input.estado,
            wompiTransaccionId: input.transaccionId,
            wompiEventoEn: input.eventoEn,
          },
        });
        return count === 1;
      } catch (error) {
        // La transacción ya está asociada a otro intento (índice único).
        if ((error as { code?: string })?.code === "P2002") {
          throw new AppError(409, "La transacción ya está asociada a otro pago.");
        }
        console.error("Error al actualizar el estado del pago:", error);
        throw new AppError(500, "Error al actualizar el pago.");
      }
    },
  };
}

export type PagosRepository = ReturnType<typeof createPagosRepository>;

export const pagosRepository = createPagosRepository();
