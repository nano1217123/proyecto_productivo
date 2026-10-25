import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { 
  actualizarImagenEjercicio, 
  actualizarVideoEjercicio,
  getEjerciciosPorGrupo 
} from "../controller/ejercicios.controller.js";

const router = Router();

// Ruta protegida: Solo los clientes pueden ver el catálogo
router.get(
  "/grupo/:grupo", 
  requireAuth, 
  requireRole("cliente"), 
  getEjerciciosPorGrupo
);

// Rutas protegidas para que el admin asigne la imagen
router.patch(
  "/:id/imagen",
  requireAuth,
  requireRole("admin", "super_admin"),
  actualizarImagenEjercicio
);

// Rutas protegidas para que el admin asigne el video
router.patch(
  "/:id/video",
  requireAuth,
  requireRole("admin", "super_admin"),
  actualizarVideoEjercicio
);

export default router;