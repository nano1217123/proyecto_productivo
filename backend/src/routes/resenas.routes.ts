import { Router } from "express";
import {
  createResena,
  descargarReporteResenas,
  listResenasPublicas,
  listTodasLasResenas,
} from "../controller/resenas.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { auditarReporte } from "../middleware/auditoriaReportes.middleware.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { validateCreateResena, validateReporteResenas } from "../validator/resenas.validator.js";

const reporteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
  message: { message: "Demasiadas descargas. Intenta de nuevo en un minuto." },
  standardHeaders: true,
  legacyHeaders: false,
});
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
// Consultar reseñas del gimnasio: clientes, particulares, administradores y superadministradores.
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
for (const formato of ["csv", "pdf"] as const) {
  router.get(
    `/gimnasio/:gymSlug/reporte.${formato}`,
    auditarReporte("resenas", formato),
    reporteLimiter,
    requireRole("admin", "super_admin"),
    validateReporteResenas("sede"),
    descargarReporteResenas(formato),
  );
  router.get(
    `/reportes/consolidado.${formato}`,
    auditarReporte("resenas", formato),
    reporteLimiter,
    requireRole("super_admin"),
    validateReporteResenas("consolidado"),
    descargarReporteResenas(formato),
  );
}
export default router;
