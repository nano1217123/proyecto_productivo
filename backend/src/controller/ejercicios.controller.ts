import type { RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/error.middleware.js";
import { AppError } from "../errors/AppError.js";
import { ejerciciosRepository } from "../repositories/ejercicios.repository.js";

// ID positivo que cabe en un BIGINT de PostgreSQL.
const idEjercicio = z.string().regex(/^[1-9]\d{0,17}$/);
const imagenVista = z.object({ imagenActual: z.string().min(1).max(2048) }).strict();

// DELETE /api/ejercicios/:id/imagen  { imagenActual }
// Quita la asociación guardada en PostgreSQL. El archivo de Cloudinary se
// conserva: puede estar asignado a otros ejercicios o al historial.
export const quitarImagenEjercicio: RequestHandler = asyncHandler(async (req, res) => {
  const id = idEjercicio.safeParse(req.params.id);
  if (!id.success) throw new AppError(400, "El identificador del ejercicio no es válido.");
  const cuerpo = imagenVista.safeParse(req.body ?? {});
  if (!cuerpo.success) throw new AppError(400, "Indica la imagen que quieres quitar.");

  const resultado = await ejerciciosRepository.quitarImagenSiCoincide(BigInt(id.data), cuerpo.data.imagenActual);
  if (resultado.estado === "no_existe") throw new AppError(404, "El ejercicio no existe.");
  if (resultado.estado === "cambiada") {
    return res.status(409).json({
      message: resultado.imagenUrl
        ? "Otro administrador cambió la imagen de este ejercicio. Revisa la imagen actual antes de quitarla."
        : "Otro administrador ya quitó la imagen de este ejercicio.",
      imagenUrl: resultado.imagenUrl,
    });
  }
  return res.status(200).json({ message: "Imagen quitada del ejercicio.", imagenUrl: null });
});

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