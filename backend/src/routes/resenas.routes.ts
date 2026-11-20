import { Router } from "express";
import {
  createResena,
  listResenasPublicas,
  listTodasLasResenas,
} from "../controller/resenas.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { validateCreateResena } from "../validator/resenas.validator.js";
const router = Router();
// Todas las rutas requieren una sesión autenticada.
router.use(requireAuth);
// Publicar reseñas: clientes de gimnasio y usuarios particulares.
router.post(
  "/",
  requireRole("cliente", "usuario_particular"),
  validateCreateResena,
  createResena
);
// Consultar reseñas positivas: clientes, particulares, administradores y superadministradores.
router.get(
  "/gimnasio/:gymSlug",
  requireRole("cliente", "usuario_particular", "admin", "super_admin"),
  listResenasPublicas
);
// Consultar todas las reseñas: únicamente superadministradores.
router.get(
  "/todas",
  requireRole("super_admin"),
  listTodasLasResenas
);
export default router;
