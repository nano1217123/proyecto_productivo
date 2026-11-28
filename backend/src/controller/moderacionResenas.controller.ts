import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { esSedeValida } from "../lib/sedes.js";
import { moderacionResenasRepository as moderacion } from "../repositories/moderacionResenas.repository.js";

const motivos = ["ACOSO", "SPAM", "DATOS_PERSONALES", "FRAUDE", "OTRO"] as const;
const denuncia = z.strictObject({
  motivo: z.enum(motivos),
  descripcion: z.string().trim().max(500).refine(texto => !texto.includes("\0")).optional(),
});
const revision = z.number().int().positive().max(2147483647);
const infraccion = z.enum(["ACOSO", "SPAM", "DATOS_PERSONALES", "FRAUDE"]);
const decisiones = z.discriminatedUnion("accion", [
  z.strictObject({ accion: z.literal("DERIVAR"), motivo: z.literal("REQUIERE_REVISION"), revision: z.null() }),
  z.strictObject({ accion: z.literal("RESOLVER"), motivo: z.literal("SIN_INFRACCION"), revision: revision.nullable() }),
  z.strictObject({ accion: z.literal("OCULTAR"), motivo: infraccion, revision }),
  z.strictObject({ accion: z.literal("RESTAURAR"), motivo: z.enum(["SIN_INFRACCION", "CONTENIDO_CORREGIDO"]), revision }),
]);
const pagina = z.string().regex(/^[1-9]\d{0,5}$/).transform(Number).default(1);
const cola = z.strictObject({
  gymSlug: z.string().refine(esSedeValida).optional(), pagina,
});
const paginada = z.strictObject({ pagina });

function validar<T>(schema: z.ZodType<T>, input: unknown): T {
  const resultado = schema.safeParse(input);
  if (!resultado.success) throw new AppError(400, "La solicitud de moderación no es válida.");
  return resultado.data;
}

function privada(fn: (req: Parameters<RequestHandler>[0], actor: string) => Promise<unknown>): RequestHandler {
  return asyncHandler(async (req, res) => {
    if (!req.userId) throw new AppError(401, "No autorizado.");
    if (process.env.NODE_ENV === "production") {
      throw new AppError(403, "La moderación de reseñas aún no está habilitada en producción.");
    }
    try {
      const salida = await fn(req, req.userId);
      return res.set("Cache-Control", "private, no-store").json(salida);
    } catch (error) {
      if (error instanceof AppError) throw error;
      // El error del driver puede contener parámetros con información personal.
      console.error("No se completó una operación de moderación de reseñas.");
      throw new AppError(500, "No se pudo completar la operación de moderación.");
    }
  });
}

export const denunciarResena = privada(async (req, actor) => {
  const { motivo, descripcion } = validar(denuncia, req.body);
  return moderacion.denunciar(actor, req.params.id, motivo, descripcion || undefined);
});

export const listarDenuncias = privada(async (req, actor) => {
  const filtro = validar(cola, req.query);
  return moderacion.listar(actor, filtro.gymSlug, filtro.pagina, false);
});

export const historialModeracion = privada(async (req, actor) => {
  const filtro = validar(cola, req.query);
  return moderacion.listar(actor, filtro.gymSlug, filtro.pagina, true);
});

export const listarResenasOcultas = privada(async (req, actor) =>
  moderacion.listarOcultas(actor, validar(paginada, req.query).pagina));

export const listarDecisionesModeracion = privada(async (req, actor) => {
  const filtro = validar(cola, req.query);
  return moderacion.listarDecisiones(actor, filtro.gymSlug, filtro.pagina);
});

export const decidirDenuncia = privada(async (req, actor) => {
  const decision = validar(decisiones, req.body);
  if (decision.accion === "RESTAURAR") throw new AppError(400, "Utiliza la acción de restauración de la reseña.");
  await moderacion.decidir(actor, { denunciaId: req.params.id }, decision);
  return { ok: true };
});

export const restaurarResena = privada(async (req, actor) => {
  const decision = validar(decisiones, req.body);
  if (decision.accion !== "RESTAURAR") throw new AppError(400, "La acción de restauración no es válida.");
  await moderacion.decidir(actor, { resenaId: req.params.id }, decision);
  return { ok: true };
});

export const depurarModeracion = privada(async (_req, actor) => {
  const resumen = await moderacion.depurar(actor);
  console.info("Depuración de moderación", resumen);
  return resumen;
});
