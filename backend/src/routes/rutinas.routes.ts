import { Router } from "express";

import {
  changeArchive,
  createRutina,
  deleteRutina,
  getRutina,
  listRutinas,
  updateRutina,
  startRoutine,
} from "../controller/rutinas.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  validateCreateRutina,
  validateUpdateRutina,
} from "../validator/rutinas.validator.js";

const router = Router();

// Todas las rutas requieren sesión.
router.use(requireAuth);

router.get("/", listRutinas);
router.post("/", validateCreateRutina, createRutina);
router.get("/:id", getRutina);
router.put("/:id", validateUpdateRutina, updateRutina);
router.post("/:id/iniciar", startRoutine);
router.patch("/:id/estado", changeArchive);
router.delete("/:id", deleteRutina);

export default router;

// rol controller
// rate limit
// 