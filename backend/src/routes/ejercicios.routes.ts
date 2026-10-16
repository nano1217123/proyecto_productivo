import { Router } from "express";
import { listEjercicios } from "../controller/ejercicios.controller.js";

const router = Router();

// Catálogo público (no requiere auth para facilitar la demo).
router.get("/", listEjercicios);

export default router;