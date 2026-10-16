import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { entrenamientosService } from "../service/entrenamientos.service.js";
import type { CreateEntrenamientoInput } from "../types/entrenamientos.types.js";

// GET /api/entrenamientos
export const listEntrenamientos: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const entrenamientos = await entrenamientosService.list(req.userId);
  return res.status(200).json({ entrenamientos });
});

// POST /api/entrenamientos
export const createEntrenamiento: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const result = await entrenamientosService.create(
    req.userId,
    req.body as CreateEntrenamientoInput
  );
  return res.status(201).json(result);
});

// GET /api/entrenamientos/ejercicio/:ejercicioId/progreso
export const getProgreso: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const ejercicioId = Number(req.params.ejercicioId);
  const progreso = await entrenamientosService.getProgreso(
    req.userId,
    ejercicioId
  );
  return res.status(200).json({ progreso });
});

// DELETE /api/entrenamientos/:id
export const deleteEntrenamiento: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  await entrenamientosService.delete(req.params.id, req.userId);
  return res.status(200).json({ message: "Entrenamiento eliminado." });
});
