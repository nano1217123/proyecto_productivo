import { Router } from "express";

import {
  createEntrenamiento,
  deleteEntrenamiento,
  getProgreso,
  listEntrenamientos,
} from "../controller/entrenamientos.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateCreateEntrenamiento } from "../validator/entrenamientos.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/", listEntrenamientos);
router.post("/", validateCreateEntrenamiento, createEntrenamiento);
router.get("/ejercicio/:ejercicioId/progreso", getProgreso);
router.delete("/:id", deleteEntrenamiento);

export default router;
