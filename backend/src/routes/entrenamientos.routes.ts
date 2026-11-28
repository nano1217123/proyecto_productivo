import { Router } from "express";

import {
  createEntrenamiento,
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
router.delete("/:id", deleteEntrenamiento);

export default router;
