import { Router, type ErrorRequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { consultarDeporte, consultarEjercicio } from "../repositories/progresoDeportivo.repository.js";
import { pesoCorporal } from "../validator/particular.validator.js";
import { consultarPeso, modificarPeso, registrarPeso } from "../repositories/progresoCorporal.repository.js";

const router = Router();
router.use(requireAuth, requireRole("cliente", "usuario_particular"), (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("Sec-Fetch-Site") === "cross-site") {
    return next(new AppError(403, "Solicitud no autorizada."));
  }
  if (["POST", "PATCH"].includes(req.method) && !req.is("application/json")) {
    return next(new AppError(415, "Envía los datos en formato JSON."));
  }
  next();
});

export function validarProgreso<T>(schema: z.ZodType<T>, input: unknown, mensaje = "Revisa los datos enviados.") {
  const data = schema.safeParse(input);
  if (!data.success) throw new AppError(400, mensaje);
  return data.data;
}

const filtrosPeso = z.strictObject({
  desde: z.iso.date().optional(),
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
  orden: z.enum(["asc", "desc"]).default("desc"),
  grafica: z.enum(["si", "no"]).default("si"),
});
const peso = z.strictObject({ pesoActualKg: pesoCorporal });
const alta = peso.extend({ id: z.uuid() });
const mensajePeso = "Ingresa un peso válido entre 20 y 300 kg.";

router.get("/peso", asyncHandler(async (req, res) => {
  const { desde, pagina, orden, grafica } = validarProgreso(filtrosPeso, req.query);
  res.json(await consultarPeso(req.userId!, desde, pagina, orden === "asc", grafica === "si"));
}));

router.post("/peso", asyncHandler(async (req, res) => {
  const { id, pesoActualKg } = validarProgreso(alta, req.body, mensajePeso);
  await registrarPeso(req.userId!, id, pesoActualKg);
  res.sendStatus(204);
}));

router.patch("/peso/:id", asyncHandler(async (req, res) => {
  const id = validarProgreso(z.uuid(), req.params.id);
  await modificarPeso(req.userId!, id, validarProgreso(peso, req.body, mensajePeso).pesoActualKg);
  res.sendStatus(204);
}));

router.delete("/peso/:id", asyncHandler(async (req, res) => {
  await modificarPeso(req.userId!, validarProgreso(z.uuid(), req.params.id), null);
  res.sendStatus(204);
}));

const periodo = z.strictObject({ desde: z.iso.date().optional(), hasta: z.iso.date() })
  .refine(({ desde, hasta }) => !desde || desde <= hasta);
router.get("/deporte", asyncHandler(async (req, res) => {
  const { desde, hasta } = validarProgreso(periodo, req.query);
  res.json(await consultarDeporte(req.userId!, desde, hasta));
}));
router.get("/ejercicios/:id", asyncHandler(async (req, res) => {
  const id = validarProgreso(z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER), req.params.id);
  const { desde, hasta } = validarProgreso(periodo, req.query);
  res.json(await consultarEjercicio(req.userId!, id, desde, hasta));
}));

const privateErrors: ErrorRequestHandler = (error, _req, _res, next) => {
  if (error instanceof AppError) return next(error);
  console.error("Error interno en Mi progreso.");
  next(new AppError(500, "No se pudo completar la operación."));
};
router.use(privateErrors);
export default router;
