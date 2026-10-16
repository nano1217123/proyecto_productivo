import type { RequestHandler } from "express";
import { asyncHandler } from "../middleware/error.middleware.js";
import { ejerciciosRepository } from "../repositories/ejercicios.repository.js";

export const listEjercicios: RequestHandler = asyncHandler(async (_req, res) => {
  const grupos = await ejerciciosRepository.findAllAgrupados();
  return res.status(200).json({ grupos });
});