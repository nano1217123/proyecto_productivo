// Repositorio del módulo de pagos.
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { generateId } from "../lib/uuid.js";
import { calcularPeriodoSede } from "../lib/suscripcionSede.js";
import { AppError } from "../errors/AppError.js";
import type {
  AplicarEstadoWompiInput,
  EstadoPago,
  NuevoPagoIntento,
  PagoIntentoConsultable,
  PagoIntentoWebhook,
  PagoIntentoOutput,
  PeriodoSedeOutput,
  PlanSuscripcion,
  RecuperarAprobacionWompiInput,
  ResultadoAplicacionWompi,
  TransaccionEnRevisionInput,
} from "../types/pagos.types.js";

// Violación de un índice único al conceder un período: otra transacción
// calculó el mismo inicio para la sede. No debería ocurrir con el cerrojo
// de la fila de la sede; si ocurre, nada se guarda y Wompi reintenta.
function esConflictoDePeriodo(error: unknown): boolean {
  const texto = `${(error as { message?: string })?.message ?? ""} ${JSON.stringify((error as { meta?: unknown })?.meta ?? "")}`;
  return (error as { code?: string })?.code === "P2002" && texto.includes("suscripciones_sede_periodos");
}

function errorDeAplicacion(error: unknown, contexto: string): never {
  if (error instanceof AppError) throw error;
  if (esConflictoDePeriodo(error)) {
    console.error(`[ALERTA PAGOS] Conflicto al conceder el período de una sede (${contexto}):`, error);
    throw new AppError(503, "No se pudo registrar la vigencia. Se reintentará.");
  }
  // La transacción ya está asociada a otro intento (índice único).
  if ((error as { code?: string })?.code === "P2002") {
    throw new AppError(409, "La transacción ya está asociada a otro pago.");
  }
  console.error(`Error al ${contexto}:`, error);
  throw new AppError(500, "Error al actualizar el pago.");
}

// Concede el período mensual de la sede a un pago recién APROBADO, dentro de
// la misma transacción que lo aprobó:
// 1. Lee el intento: la sede y el plan salen del intento guardado al iniciar
//    el checkout.
// 2. Bloquea la fila de la sede (la crea vacía si no existe), así que dos
//    pagos distintos de la misma sede se encadenan en lugar de pisarse.
// 3. Si el pago ya tiene período, no hace nada (pago_id es único en la base).
// 4. Calcula el período (lib/suscripcionSede.ts), lo guarda y actualiza la
//    vigencia de la sede.
async function concederPeriodoSede(
  tx: Prisma.TransactionClient,
  pagoId: string,
  aprobadoEn: Date
): Promise<PeriodoSedeOutput | null> {
  const pago = await tx.pagoIntento.findUnique({
    where: { id: pagoId },
    select: { plan: true, gymSlug: true, estado: true, wompiTransaccionId: true },
  });
  if (!pago || pago.plan !== "suscripcion_sede" || !pago.gymSlug) return null;
  if (pago.estado !== "APROBADO" || !pago.wompiTransaccionId) return null;
  const gymSlug = pago.gymSlug;

  await tx.$executeRaw`
    INSERT INTO suscripciones_sede (gym_slug) VALUES (${gymSlug})
    ON CONFLICT (gym_slug) DO NOTHING`;
  const [actual] = await tx.$queryRaw<{ vigente_hasta: Date | null; dia_corte: number | null }[]>`
    SELECT vigente_hasta, dia_corte FROM suscripciones_sede
    WHERE gym_slug = ${gymSlug} FOR UPDATE`;

  const existente = await tx.suscripcionSedePeriodo.findUnique({ where: { pagoId }, select: { id: true } });
  if (existente) return null;

  const periodo = calcularPeriodoSede(
    { vigenteHasta: actual?.vigente_hasta ?? null, diaCorte: actual?.dia_corte ?? null },
    aprobadoEn
  );
  await tx.suscripcionSedePeriodo.create({
    data: {
      id: generateId(),
      gymSlug,
      pagoId,
      wompiTransaccionId: pago.wompiTransaccionId,
      tipo: periodo.tipo,
      aprobadoEn,
      desde: periodo.desde,
      hasta: periodo.hasta,
    },
  });
  await tx.suscripcionSede.update({
    where: { gymSlug },
    data: { vigenteHasta: periodo.hasta, diaCorte: periodo.diaCorte, ultimoPagoId: pagoId },
  });
  return { tipo: periodo.tipo, desde: periodo.desde, hasta: periodo.hasta };
}

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
            ambiente: input.ambiente,
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
            plan: true,
            gymSlug: true,
            ambiente: true,
          },
        });
        return pago
          ? { ...pago, estado: pago.estado as EstadoPago, plan: pago.plan as PlanSuscripcion }
          : null;
      } catch (error) {
        console.error("Error al consultar el intento de pago:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // Aplica el nuevo estado con un UPDATE condicional, atómico frente a
    // eventos simultáneos: solo cambia la fila si
    // - su estado actual está en `estadosPrevios`,
    // - no tiene transacción o tiene esta misma, y
    // - no se aplicó antes un evento más reciente.
    // Si el pago de una sede pasa a APROBADO, en la misma transacción de
    // PostgreSQL se le concede su período (concederPeriodoSede): o se guardan
    // las dos cosas, o ninguna.
    async aplicarEstadoWompi(input: AplicarEstadoWompiInput): Promise<ResultadoAplicacionWompi> {
      try {
        return await prisma.$transaction(async (tx) => {
          const { count } = await tx.pagoIntento.updateMany({
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
          if (count !== 1) return { aplicado: false, periodo: null };
          const periodo = input.estado === "APROBADO"
            ? await concederPeriodoSede(tx, input.pagoId, input.aprobadoEn)
            : null;
          return { aplicado: true, periodo };
        });
      } catch (error) {
        errorDeAplicacion(error, "actualizar el estado del pago");
      }
    },

    // Recupera una aprobación con otra transacción de la misma referencia
    // (reintento de pago en Wompi). UPDATE condicional al estado previo
    // (RECHAZADO o ERROR) y al ID de la transacción guardada: si otra
    // solicitud cambió la fila antes, no hace nada. No se compara la fecha:
    // la aprobación verificada prevalece sobre el rechazo anterior. Concede
    // el período de la sede en la misma transacción.
    async recuperarAprobacionWompi(input: RecuperarAprobacionWompiInput): Promise<ResultadoAplicacionWompi> {
      try {
        return await prisma.$transaction(async (tx) => {
          const { count } = await tx.pagoIntento.updateMany({
            where: {
              id: input.pagoId,
              estado: { in: [...input.estadosPrevios] },
              wompiTransaccionId: input.transaccionIdAnterior,
            },
            data: {
              estado: "APROBADO",
              wompiTransaccionId: input.transaccionId,
              wompiEventoEn: input.eventoEn,
            },
          });
          if (count !== 1) return { aplicado: false, periodo: null };
          return { aplicado: true, periodo: await concederPeriodoSede(tx, input.pagoId, input.aprobadoEn) };
        });
      } catch (error) {
        errorDeAplicacion(error, "recuperar la aprobación del pago");
      }
    },

    // Guarda una transacción aprobada que no concedió vigencia (por ejemplo,
    // una segunda aprobación para la misma referencia). Idempotente: el par
    // (pago, transacción) es único.
    async registrarTransaccionEnRevision(input: TransaccionEnRevisionInput): Promise<void> {
      try {
        await prisma.$executeRaw`
          INSERT INTO pagos_transacciones_revision
            (id, pago_id, wompi_transaccion_id, transaccion_aplicada_id, motivo, origen)
          VALUES (${generateId()}::uuid, ${input.pagoId}::uuid, ${input.transaccionId},
                  ${input.transaccionAplicadaId}, ${input.motivo}, ${input.origen})
          ON CONFLICT (pago_id, wompi_transaccion_id) DO NOTHING`;
      } catch (error) {
        console.error("Error al guardar la transacción para revisión:", error);
        throw new AppError(500, "Error al registrar la transacción para revisión.");
      }
    },

    // Vigencia actual de varias sedes.
    async findSuscripcionesSede(gymSlugs: string[]): Promise<Map<string, Date | null>> {
      try {
        const filas = await prisma.suscripcionSede.findMany({
          where: { gymSlug: { in: gymSlugs } },
          select: { gymSlug: true, vigenteHasta: true },
        });
        return new Map(filas.map((f) => [f.gymSlug, f.vigenteHasta]));
      } catch (error) {
        console.error("Error al consultar la suscripción de las sedes:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },

    // Vigencia actual de la sede de un pago y período que ese pago concedió.
    async findVigenciaDePago(
      referencia: string
    ): Promise<{ vigenteHasta: Date | null; periodo: PeriodoSedeOutput | null } | null> {
      try {
        const pago = await prisma.pagoIntento.findUnique({
          where: { referencia },
          select: {
            gymSlug: true,
            periodosSede: { select: { tipo: true, desde: true, hasta: true }, take: 1 },
          },
        });
        if (!pago?.gymSlug) return null;
        const sede = await prisma.suscripcionSede.findUnique({
          where: { gymSlug: pago.gymSlug },
          select: { vigenteHasta: true },
        });
        const periodo = pago.periodosSede[0];
        return {
          vigenteHasta: sede?.vigenteHasta ?? null,
          periodo: periodo ? { tipo: periodo.tipo as PeriodoSedeOutput["tipo"], desde: periodo.desde, hasta: periodo.hasta } : null,
        };
      } catch (error) {
        console.error("Error al consultar la vigencia del pago:", error);
        throw new AppError(500, "Error al consultar la base de datos.");
      }
    },
  };
}

export type PagosRepository = ReturnType<typeof createPagosRepository>;

export const pagosRepository = createPagosRepository();
