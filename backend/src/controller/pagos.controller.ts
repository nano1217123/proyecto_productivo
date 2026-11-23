import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { pagosService, type PagosService } from "../service/pagos.service.js";
import type { IniciarPagoInput } from "../types/pagos.types.js";

export function createPagosController(service: PagosService = pagosService) {
  return {
    // GET /api/pagos/opciones
    // Planes y sedes que el usuario autenticado puede pagar.
    listarOpciones: asyncHandler(async (req, res) => {
      if (!req.userId) throw new AppError(401, "No autorizado.");
      if (!req.userRole) throw new AppError(403, "No se pudo verificar tu rol.");

      const opciones = await service.listarOpciones(req.userId, req.userRole);
      return res.status(200).json({ opciones });
    }) satisfies RequestHandler,

    // POST /api/pagos/wompi/checkout
    // Registra el intento de pago y devuelve la URL firmada del checkout.
    iniciarCheckoutWompi: asyncHandler(async (req, res) => {
      if (!req.userId) throw new AppError(401, "No autorizado.");
      if (!req.userRole) throw new AppError(403, "No se pudo verificar tu rol.");

      const resultado = await service.iniciarCheckoutWompi(
        req.userId,
        req.userEmail,
        req.userRole,
        req.body as IniciarPagoInput
      );
      return res.status(201).json(resultado);
    }) satisfies RequestHandler,
  };
}

export type PagosController = ReturnType<typeof createPagosController>;
