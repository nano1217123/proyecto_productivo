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