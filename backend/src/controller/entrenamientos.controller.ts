import { z } from "zod";
import { corregirDetalle } from "../repositories/historial.repository.js";
import { contenidoSesion, idSesion, leerSesion, revisionSesion } from "../validator/sesionEntrenamiento.validator.js";
import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { entrenamientosService } from "../service/entrenamientos.service.js";
import type { CreateEntrenamientoInput } from "../types/entrenamientos.types.js";

// GET /api/entrenamientos
export const listEntrenamientos: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const entrenamientos = await entrenamientosService.list(req.userId);
  return res.status(200).json({ entrenamientos });
});

// POST /api/entrenamientos
export const createEntrenamiento: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const result = await entrenamientosService.create(
    req.userId,
    req.body as CreateEntrenamientoInput
  );
  return res.status(201).json(result);
});

// GET /api/entrenamientos/ejercicio/:ejercicioId/progreso
export const getProgreso: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  const ejercicioId = Number(req.params.ejercicioId);
  const progreso = await entrenamientosService.getProgreso(
    req.userId,
    ejercicioId
  );
  return res.status(200).json({ progreso });
});

// DELETE /api/entrenamientos/:id
export const deleteEntrenamiento: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  await entrenamientosService.delete(leerSesion(idSesion, req.params.id), req.userId);
  return res.status(200).json({ message: "Entrenamiento eliminado." });
});

const correccion = z.object({
  nombre: z.string().trim().min(1).max(100),
  notas: z.string().trim().max(200),
}).strict();

export const corregirEntrenamiento: RequestHandler = asyncHandler(async (req, res) => {
  const id = leerSesion(idSesion, req.params.id);
  if (req.body && Object.hasOwn(req.body, "contenido")) {
    const schema = z.object({ revision: revisionSesion, fecha: z.iso.date(), contenido: contenidoSesion }).strict();
    const { revision, fecha, contenido } = leerSesion(schema, req.body);
    const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(new Date());
    if (fecha > hoy || !contenido.nombre.trim() || !contenido.ejercicios.length ||
      contenido.ejercicios.some((item) => !item.series.length || item.series.some((serie) => !serie.completada))) {
      throw new AppError(400, "Indica una fecha válida, un nombre y al menos una serie completada por ejercicio.");
    }
    await corregirDetalle(req.userId!, id, revision, fecha, contenido);
    return res.status(204).end();
  }
  const { nombre, notas } = leerSesion(correccion, req.body);
  await entrenamientosService.corregir(id, req.userId!, nombre, notas);
  res.status(204).end();
});
