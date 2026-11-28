import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { 
  actualizarImagenEjercicio, 
  getEjerciciosPorGrupo,
  getCatalogoCompleto, // 👈 Importamos la nueva función
  quitarImagenEjercicio,
} from "../controller/ejercicios.controller.js";

const router = Router();

// 👇 RUTA NUEVA: Catálogo completo (con soporte para ?modo=casa)
router.get("/", getCatalogoCompleto);

// Ruta pública para que el cliente vea los ejercicios con sus imágenes
router.get("/grupo/:grupo", getEjerciciosPorGrupo);

// Ruta protegida para que el admin asigne la imagen
router.patch(
  "/:id/imagen",
  requireAuth,
  requireRole("admin", "super_admin"),
  actualizarImagenEjercicio
);

// Quitar la imagen asignada: mismos permisos que asignarla.
router.delete(
  "/:id/imagen",
  requireAuth,
  requireRole("admin", "super_admin"),
  quitarImagenEjercicio
);

export default router;