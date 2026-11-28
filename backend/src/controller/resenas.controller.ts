import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { auditarArchivoGenerado } from "../middleware/auditoriaReportes.middleware.js";
import { resenasService } from "../service/resenas.service.js";
import { parseConsultaResenasAdmin, parseConsultaResenasPublicas, parseRespuestaOficial } from "../validator/resenas.validator.js";
import type { AccionRespuesta } from "../types/resenas.types.js";
import type { CreateResenaInput, FormatoReporteResenas, ReporteResenasInput, UpdateResenaInput } from "../types/resenas.types.js";
// POST /api/resenas
// Publica una reseña para el usuario autenticado.
export const createResena: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) {
    throw new AppError(401, "No autorizado.");
  }
  if (!req.userRole) {
    throw new AppError(403, "No se pudo verificar tu rol.");
  }
  const resena = await resenasService.create(
    req.userId,
    req.userRole,
    req.body as CreateResenaInput
  );
  return res.status(201).json({ resena });
});

export const listMisResenas: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const resenas = await resenasService.listOwn(req.userId);
  return res.set("Cache-Control", "private, no-store").json({ resenas });
});

export const updateMiResena: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const resena = await resenasService.updateOwn(req.userId, req.params.id, req.body as UpdateResenaInput);
  return res.set("Cache-Control", "private, no-store").json({ resena });
});

export const deleteMiResena: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  await resenasService.deleteOwn(req.userId, req.params.id);
  return res.status(204).end();
});

export function gestionarVotoUtil(marcar: boolean): RequestHandler {
  return asyncHandler(async (req, res) => {
    if (!req.userId) throw new AppError(401, "No autorizado.");
    const voto = await resenasService.gestionarVotoUtil(req.userId, req.params.id, marcar);
    return res.set("Cache-Control", "private, no-store").json(voto);
  });
}
// GET /api/resenas/gimnasio/:gymSlug
// Devuelve las reseñas de la comunidad del gimnasio solicitado.
export const listResenasPublicas: RequestHandler = asyncHandler(
  async (req, res) => {
    if (!req.userId) throw new AppError(401, "No autorizado.");
    if (!req.userRole) {
      throw new AppError(403, "No se pudo verificar tu rol.");
    }
    const gymSlug = req.params.gymSlug;
    const resultado = await resenasService.listPublic(
      gymSlug,
      req.userRole,
      req.userId,
      parseConsultaResenasPublicas(req.query),
    );
    return res.set("Cache-Control", "private, no-store").json(resultado);
  }
);

export function descargarReporteResenas(formato: FormatoReporteResenas): RequestHandler {
  return asyncHandler(async (req, res) => {
    if (!req.userId) throw new AppError(401, "No autorizado.");
    if (!req.userRole) throw new AppError(403, "No se pudo verificar tu rol.");
    const input = res.locals.reporteResenas as ReporteResenasInput;
    const archivo = await resenasService.exportarReporte(req.userId, req.userRole, input, formato);
    if (!await auditarArchivoGenerado(res, input.alcance === "sede"
      ? { tipo: "sede", sede: input.gymSlug } : { tipo: "consolidado" })) return;
    const alcance = input.alcance === "sede" ? input.gymSlug : "consolidado";
    return res.status(200)
      .set("Cache-Control", "private, no-store")
      .set("X-Content-Type-Options", "nosniff")
      .attachment(`resenas-${alcance}.${formato}`)
      .type(formato === "pdf" ? "application/pdf" : "text/csv; charset=utf-8")
      .send(archivo);
  });
}

export const listResenasAdministrativas: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const resultado = await resenasService.listAdminPage(
    req.userId, req.params.gymSlug, parseConsultaResenasAdmin(req.query),
  );
  return res.set("Cache-Control", "private, no-store").json(resultado);
});

export function gestionarRespuestaOficial(tipo: AccionRespuesta["tipo"]): RequestHandler {
  return asyncHandler(async (req, res) => {
    if (!req.userId) throw new AppError(401, "No autorizado.");
    const accion: AccionRespuesta = tipo === "retirar" ? { tipo } : { tipo, texto: parseRespuestaOficial(req.body) };
    const respuesta = await resenasService.gestionarRespuesta(req.userId, req.params.id, accion);
    if (tipo === "retirar") return res.status(204).end();
    return res.status(tipo === "publicar" ? 201 : 200).set("Cache-Control", "private, no-store").json({ respuesta });
  });
}
// GET /api/resenas/todas
// Disponible exclusivamente para el superadministrador.
export const listTodasLasResenas: RequestHandler = asyncHandler(
  async (req, res) => {
    if (!req.userId) throw new AppError(401, "No autorizado.");
    if (!req.userRole) {
      throw new AppError(403, "No se pudo verificar tu rol.");
    }
    const resenas = await resenasService.listAll(req.userRole, req.userId);
    return res.set("Cache-Control", "private, no-store").json({ resenas });
  }
);
