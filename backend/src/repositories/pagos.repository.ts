// Repositorio del módulo de pagos.
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";
import type {
  NuevoPagoIntento,
  PagoIntentoOutput,
  PlanSuscripcion,
} from "../types/pagos.types.js";

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
            usuarioId: input.usuarioId,
            gymSlug: input.gymSlug,
            montoEnCentavos: input.montoEnCentavos,
            moneda: input.moneda,
            estado: "PENDIENTE",
          },
          select: {
            referencia: true,
            plan: true,
            gymSlug: true,
            montoEnCentavos: true,
            moneda: true,
            estado: true,
            creadoEn: true,
          },
        });

        return {
          referencia: pago.referencia,
          plan: pago.plan as PlanSuscripcion,
          gym_slug: pago.gymSlug,
          monto_en_centavos: pago.montoEnCentavos,
          moneda: pago.moneda,
          estado: pago.estado,
          creado_en: pago.creadoEn,
        };
      } catch (error) {
        console.error("Error al guardar el intento de pago:", error);
        throw new AppError(500, "No se pudo registrar el pago.");
      }
    },
  };
}

export type PagosRepository = ReturnType<typeof createPagosRepository>;

export const pagosRepository = createPagosRepository();
