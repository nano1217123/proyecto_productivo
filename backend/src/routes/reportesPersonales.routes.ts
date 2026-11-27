import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { AppError } from "../errors/AppError.js";
import { exportarReportePersonal } from "../service/reportesPersonales.service.js";

const fecha = z.iso.date().refine(valor => !valor.startsWith("0000-"));
const filtros = z.strictObject({ desde: fecha.optional(), hasta: fecha.optional() })
  .refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta);
const router = Router();
router.use(requireAuth);
const cuota = rateLimit({ windowMs: 60_000, limit: 10, keyGenerator: req => req.userId!,
  standardHeaders: true, legacyHeaders: false, message: { message: "Demasiadas descargas." } });

for (const tipo of ["progreso", "rutinas", "ejercicios"] as const) {
  for (const formato of ["csv", "pdf"] as const) {
    router.get(`/${tipo}.${formato}`, cuota, asyncHandler(async (req, res) => {
      if (!req.userId) throw new AppError(401, "No autorizado.");
      const resultado = filtros.safeParse(req.query);
      if (!resultado.success) throw new AppError(400, "Usa fechas válidas y un rango en orden.");
      const archivo = await exportarReportePersonal(req.userId, tipo, formato, resultado.data);
      res.set("Cache-Control", "private, no-store").set("X-Content-Type-Options", "nosniff")
        .attachment(`${tipo}.${formato}`)
        .type(formato === "csv" ? "text/csv; charset=utf-8" : "application/pdf").send(archivo);
    }));
  }
}
export default router;
