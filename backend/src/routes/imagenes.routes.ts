import { Router } from "express";
import multer from "multer";
import { uploadImage } from "../controller/imagenes.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";

// Configuramos multer para que guarde el archivo en memoria (buffer)
// Esto es ideal para pasarlo directo a Cloudinary sin llenar el disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB para las imágenes
  },
});

const router = Router();

// POST /api/imagenes/subir
// Solo los administradores y super_admins pueden subir fotos.
router.post(
  "/subir",
  requireAuth,
  requireRole("admin", "super_admin"),
  upload.single("imagen"), // "imagen" es el nombre del campo en el FormData
  uploadImage
);

export default router;