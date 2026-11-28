import { z } from "zod";
import { asyncHandler } from "../middleware/error.middleware.js";
import { sesionesEntrenamiento } from "../repositories/sesionEntrenamiento.repository.js";
import { cambioSesion, idSesion, inicioSesion, leerSesion, revisionSesion } from "../validator/sesionEntrenamiento.validator.js";

const cierre = z.object({ revision: revisionSesion }).strict();

export const obtenerActiva = asyncHandler(async (req, res) => {
  res.json({ sesion: await sesionesEntrenamiento.activa(req.userId!) });
});

export const iniciarSesion = asyncHandler(async (req, res) => {
  const { id, contenido } = leerSesion(inicioSesion, req.body);
  res.json({ sesion: await sesionesEntrenamiento.iniciar(req.userId!, id, contenido) });
});

export const guardarSesion = asyncHandler(async (req, res) => {
  const id = leerSesion(idSesion, req.params.id);
  const { revision, contenido } = leerSesion(cambioSesion, req.body);
  res.json({ sesion: await sesionesEntrenamiento.guardar(req.userId!, id, revision, contenido) });
});

export function cerrarSesion(estado: "finalizado" | "cancelado") {
  return asyncHandler(async (req, res) => {
    const id = leerSesion(idSesion, req.params.id);
    const { revision } = leerSesion(cierre, req.body);
    res.json({ sesion: await sesionesEntrenamiento.cerrar(req.userId!, id, revision, estado) });
  });
}
