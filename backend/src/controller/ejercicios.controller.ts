import type { RequestHandler } from "express";
import { asyncHandler } from "../middleware/error.middleware.js";
import { AppError } from "../errors/AppError.js";
import { ejerciciosRepository } from "../repositories/ejercicios.repository.js";

export const actualizarImagenEjercicio: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { imagenUrl } = req.body;

  if (!imagenUrl) {
    throw new AppError(400, "Falta la URL de la imagen.");
  }

  await ejerciciosRepository.updateImagen(BigInt(id), imagenUrl);

  return res.status(200).json({
    message: "Imagen asignada correctamente al ejercicio.",
  });
});

// 👇 NUEVA FUNCIÓN PARA VIDEO 👇
export const actualizarVideoEjercicio: RequestHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { videoUrl } = req.body;

  if (!videoUrl) {
    throw new AppError(400, "Falta la URL del video.");
  }

  await ejerciciosRepository.updateVideo(BigInt(id), videoUrl);

  return res.status(200).json({
    message: "Video asignado correctamente al ejercicio.",
  });
});

export const getEjerciciosPorGrupo: RequestHandler = asyncHandler(async (req, res) => {
  const { grupo } = req.params;
  const ejercicios = await ejerciciosRepository.findAllAgrupados();
  const grupoEncontrado = ejercicios.find((g: any) => g.slug === grupo);
  
  if (!grupoEncontrado) {
    throw new AppError(404, "Grupo no encontrado.");
  }
  return res.status(200).json(grupoEncontrado.ejercicios);
});