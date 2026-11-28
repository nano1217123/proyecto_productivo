import { Router } from "express";
import {
  createResena,
  deleteMiResena,
  descargarReporteResenas,
  gestionarRespuestaOficial,
  gestionarVotoUtil,
  listResenasAdministrativas,
  listResenasPublicas,
  listMisResenas,
  listTodasLasResenas,
  updateMiResena,
} from "../controller/resenas.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  decidirDenuncia, denunciarResena, depurarModeracion, historialModeracion,
  listarDecisionesModeracion, listarDenuncias, listarResenasOcultas, restaurarResena,
} from "../controller/moderacionResenas.controller.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { auditarReporte } from "../middleware/auditoriaReportes.middleware.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { validateCreateResena, validateReporteResenas, validateResenaId, validateUpdateResena } from "../validator/resenas.validator.js";

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
router.get("/mias", listMisResenas);
router.patch("/mias/:id", validateResenaId, validateUpdateResena, updateMiResena);
router.delete("/mias/:id", validateResenaId, deleteMiResena);
router.get("/gestion/gimnasio/:gymSlug", requireRole("admin"), listResenasAdministrativas);
router.post("/gestion/:id/respuesta", requireRole("admin"), validateResenaId, gestionarRespuestaOficial("publicar"));
router.patch("/gestion/:id/respuesta", requireRole("admin"), validateResenaId, gestionarRespuestaOficial("editar"));
router.delete("/gestion/:id/respuesta", requireRole("admin"), validateResenaId, gestionarRespuestaOficial("retirar"));
router.put("/:id/voto-util", validateResenaId, gestionarVotoUtil(true));
router.delete("/:id/voto-util", validateResenaId, gestionarVotoUtil(false));
const denunciaLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 10,
  keyGenerator: req => req.userId ?? ipKeyGenerator(req.ip ?? ""),
  message: { message: "Demasiadas denuncias. Intenta de nuevo en un minuto." },
  standardHeaders: true, legacyHeaders: false,
});
router.post("/:id/denuncias", requireRole("cliente", "usuario_particular"), denunciaLimiter, validateResenaId, denunciarResena);
router.get("/moderacion/denuncias", requireRole("admin", "super_admin"), listarDenuncias);
router.get("/moderacion/historial", requireRole("super_admin"), historialModeracion);
router.get("/moderacion/decisiones", requireRole("super_admin"), listarDecisionesModeracion);
router.get("/moderacion/ocultas", requireRole("super_admin"), listarResenasOcultas);
router.post("/moderacion/denuncias/:id/decisiones", requireRole("admin", "super_admin"), validateResenaId, decidirDenuncia);
router.post("/moderacion/resenas/:id/restaurar", requireRole("super_admin"), validateResenaId, restaurarResena);
router.post("/moderacion/depuracion", requireRole("super_admin"), depurarModeracion);
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
