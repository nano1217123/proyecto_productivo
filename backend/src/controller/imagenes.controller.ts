import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { cloudinaryService } from "../service/cloudinary.service.js";

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  // multer pone el archivo en req.file
  if (!req.file) {
    throw new AppError(400, "No se ha enviado ninguna imagen.");
  }

  // Validamos que sea una imagen (por si acaso)
  if (!req.file.mimetype.startsWith("image/")) {
    throw new AppError(400, "El archivo debe ser una imagen válida (jpg, png, webp, etc).");
  }

  // Subimos el buffer a Cloudinary
  const imageUrl = await cloudinaryService.uploadImage(req.file.buffer);

  return res.status(200).json({
    message: "Imagen subida exitosamente.",
    url: imageUrl,
  });
});

// 👇 NUEVA FUNCIÓN PARA SUBIR VIDEOS 👇
export const uploadVideo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, "No se ha enviado ningún video.");
  }

  if (!req.file.mimetype.startsWith("video/")) {
    throw new AppError(400, "El archivo debe ser un video válido (mp4, webm, etc).");
  }

  const videoUrl = await cloudinaryService.uploadVideo(req.file.buffer);

  return res.status(200).json({
    message: "Video subido exitosamente.",
    url: videoUrl,
  });
});