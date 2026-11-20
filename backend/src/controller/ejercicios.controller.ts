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

export const getEjerciciosPorGrupo: RequestHandler = asyncHandler(async (req, res) => {
  const { grupo } = req.params;
  
  // 1. Leemos si la URL dice ?modo=casa
  const modoCasa = req.query.modo === "casa";
  
  // 2. Le pasamos el parámetro al repositorio
  const ejercicios = await ejerciciosRepository.findAllAgrupados(modoCasa);
  
  const grupoEncontrado = ejercicios.find((g: any) => g.slug === grupo);
  
  if (!grupoEncontrado) {
    throw new AppError(404, "Grupo no encontrado.");
  }
  return res.status(200).json(grupoEncontrado.ejercicios);
});

export const getCatalogoCompleto: RequestHandler = asyncHandler(async (req, res) => {
  // 1. Capturamos el ?modo=casa
  const modoCasa = req.query.modo === "casa";
  
  // 2. Le pasamos el filtro al repositorio
  const grupos = await ejerciciosRepository.findAllAgrupados(modoCasa);
  
  // 3. Devolvemos el objeto con la propiedad 'grupos'
  return res.status(200).json({ grupos });
});