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
// Publicar reseñas: únicamente clientes.
router.post(
  "/",
  requireRole("cliente"),
  validateCreateResena,
  createResena
);
// Consultar reseñas positivas: clientes, administradores y superadministradores.
router.get(
  "/gimnasio/:gymSlug",
  requireRole("cliente", "admin", "super_admin"),
  listResenasPublicas
);
// Consultar todas las reseñas: únicamente superadministradores.
router.get(
  "/todas",
  requireRole("super_admin"),
  listTodasLasResenas
);
export default router;
