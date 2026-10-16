import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { rutinasService } from "../service/rutinas.service.js";
import type {
  CreateRutinaInput,
  UpdateRutinaInput,
} from "../types/rutinas.types.js";

// GET /api/rutinas
export const listRutinas: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado.");
  }
  const rutinas = await rutinasService.list(req.userId);
  return res.status(200).json({ rutinas });
});

// GET /api/rutinas/:id
export const getRutina: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado.");
  }
  const rutina = await rutinasService.getById(req.params.id, req.userId);
  return res.status(200).json({ rutina });
});

// POST /api/rutinas
export const createRutina: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado.");
  }
  const result = await rutinasService.create(
    req.userId,
    req.body as CreateRutinaInput
  );
  return res.status(201).json(result);
});

// PUT /api/rutinas/:id
export const updateRutina: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado.");
  }
  const input = req.body as Omit<UpdateRutinaInput, "rutinaId">;
  await rutinasService.update(req.userId, {
    ...input,
    rutinaId: req.params.id,
  });
  return res.status(200).json({ message: "Rutina actualizada." });
});

// DELETE /api/rutinas/:id
export const deleteRutina: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado.");
  }
  await rutinasService.delete(req.params.id, req.userId);
  return res.status(200).json({ message: "Rutina eliminada." });
});