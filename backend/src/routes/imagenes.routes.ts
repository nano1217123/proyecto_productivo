import { Router } from "express";
import multer from "multer";
import { uploadImage, uploadVideo } from "../controller/imagenes.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";

// Configuramos multer para que guarde el archivo en memoria (buffer)
// Aumentamos el límite a 50MB para permitir la subida de videos.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

const router = Router();

// POST /api/imagenes/subir (Imágenes)
router.post(
  "/subir",
  requireAuth,
  requireRole("admin", "super_admin"),
  upload.single("imagen"),
  uploadImage
);

// POST /api/imagenes/subir-video (Videos)
router.post(
  "/subir-video",
  requireAuth,
  requireRole("admin", "super_admin"),
  upload.single("video"),
  uploadVideo
);

export default router;