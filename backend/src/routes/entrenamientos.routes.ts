import { requireRole } from "../middleware/requireRole.middleware.js";
import { compararHistorial, listarHistorial, repetirHistorial, verActividad, verDetalle, verResumenInicio } from "../controller/historial.controller.js";
import { Router } from "express";

import {
  createEntrenamiento,
  corregirEntrenamiento,
  deleteEntrenamiento,
  getProgreso,
  listEntrenamientos,
} from "../controller/entrenamientos.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateCreateEntrenamiento } from "../validator/entrenamientos.validator.js";

import { cerrarSesion, guardarSesion, iniciarSesion, obtenerActiva } from "../controller/sesionEntrenamiento.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/activa", obtenerActiva);
router.post("/activa", iniciarSesion);
router.put("/activa/:id", guardarSesion);
router.post("/activa/:id/finalizar", cerrarSesion("finalizado"));
router.post("/activa/:id/cancelar", cerrarSesion("cancelado"));
router.get("/", listEntrenamientos);
router.post("/", validateCreateEntrenamiento, createEntrenamiento);
router.get("/ejercicio/:ejercicioId/progreso", getProgreso);
router.get("/historial", listarHistorial);
router.get("/actividad", verActividad);
router.get("/resumen-inicio", requireRole("cliente", "usuario_particular"), verResumenInicio);
router.get("/comparar", compararHistorial);
router.get("/:id", verDetalle);
router.post("/:id/repetir", repetirHistorial);
router.patch("/:id", corregirEntrenamiento);
router.delete("/:id", deleteEntrenamiento);

export default router;
