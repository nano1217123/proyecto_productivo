import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  signature_algorithm: "sha256", 
});

export function createCloudinaryService() {
  return {
    // Sube un buffer de imagen a Cloudinary y devuelve la URL segura
    async uploadImage(fileBuffer: Buffer, folder: string = "jjgym"): Promise<string> {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: "image" },
          (error, result) => {
            if (error || !result) {
              console.error("Error en Cloudinary:", error);
              return reject(new AppError(500, "No se pudo subir la imagen a la nube."));
            }
            resolve(result.secure_url);
          }
        );
        // Enviamos el buffer al stream de Cloudinary
        uploadStream.end(fileBuffer);
      });
    },
  };
}

export const cloudinaryService = createCloudinaryService();