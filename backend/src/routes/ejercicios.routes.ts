import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { 
  actualizarImagenEjercicio, 
  getEjerciciosPorGrupo 
} from "../controller/ejercicios.controller.js";

const router = Router();

// Ruta pública para que el cliente vea los ejercicios con sus imágenes
router.get("/grupo/:grupo", getEjerciciosPorGrupo);

// Ruta protegida para que el admin asigne la imagen
router.patch(
  "/:id/imagen",
  requireAuth,
  requireRole("admin", "super_admin"),
  actualizarImagenEjercicio
);

export default router;