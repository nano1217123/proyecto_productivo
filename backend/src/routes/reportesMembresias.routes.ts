import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { auditarArchivoGenerado, auditarReporte } from "../middleware/auditoriaReportes.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { esSedeValida } from "../lib/sedes.js";
import { exportarMembresias } from "../service/reportesMembresias.service.js";

const router = Router();
const fecha = z.iso.date().refine(valor => !valor.startsWith("0000-"));
const filtros = z.strictObject({ desde: fecha.optional(), hasta: fecha.optional() })
  .refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta);
const cuota = rateLimit({ windowMs: 60_000, limit: 10, keyGenerator: req => req.userId!,
  standardHeaders: true, legacyHeaders: false, message: { message: "Demasiadas descargas." } });
router.use(requireAuth);

for (const formato of ["csv", "pdf"] as const) {
  for (const consolidado of [false, true]) {
    router.get(consolidado ? `/consolidado.${formato}` : `/sede/:slug.${formato}`,
      auditarReporte("membresias", formato),
      cuota, consolidado ? requireRole("super_admin") : requireRole("admin", "super_admin"),
      asyncHandler(async (req, res) => {
        if (!req.userId) throw new AppError(401, "No autorizado.");
        const slug = consolidado ? null : req.params.slug;
        if (slug !== null && !esSedeValida(slug)) throw new AppError(404, "Sede no encontrada.");
        const filtro = filtros.safeParse(req.query);
        if (!filtro.success) throw new AppError(400, "Usa fechas válidas y un rango en orden.");
        const archivo = await exportarMembresias(req.userId, req.userRole, slug, formato, filtro.data);
        if (!await auditarArchivoGenerado(res, slug === null
          ? { tipo: "consolidado" } : { tipo: "sede", sede: slug })) return;
        res.set("Cache-Control", "private, no-store").set("X-Content-Type-Options", "nosniff")
          .attachment(`membresias-${slug ?? "consolidado"}.${formato}`)
          .type(formato === "csv" ? "text/csv; charset=utf-8" : "application/pdf").send(archivo);
      }));
  }
}
export default router;
