import { prepararComparacion } from "../service/compararEntrenamientos.js";
import { AppError } from "../errors/AppError.js";
import { sesionesEntrenamiento } from "../repositories/sesionEntrenamiento.repository.js";
import { contenidoSesion } from "../validator/sesionEntrenamiento.validator.js";
import { z } from "zod";
import { asyncHandler } from "../middleware/error.middleware.js";
import { actividadHistorial, consultarHistorial, detalleHistorial, resumenInicio } from "../repositories/historial.repository.js";
import { idSesion, leerSesion } from "../validator/sesionEntrenamiento.validator.js";

const fecha = z.iso.date().refine((value) => !value.startsWith("0000"), "El año debe ser mayor a cero.");
const texto = z.string().trim().max(120).refine((value) => !value.includes("\u0000"), "El texto contiene un carácter inválido.").optional();
const filtros = z.object({
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
  buscar: texto, desde: fecha.optional(), hasta: fecha.optional(),
  grupo: texto, ejercicio: texto, rutina: texto,
  duracion: z.coerce.number().int().min(0).max(1440).optional(),
  records: z.enum(["true"]).transform(() => true).optional(),
  orden: z.enum(["recientes", "antiguos", "larga", "corta", "volumen"]).default("recientes"),
}).strict().refine(({ desde, hasta }) => !desde || !hasta || desde <= hasta, "El rango de fechas es inválido.");

const actividad = z.object({ semana: fecha, mes: fecha, hoy: fecha, desde: fecha, hasta: fecha }).strict()
  .refine(({ desde, hasta }) => {
    const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400000;
    return dias >= 0 && dias <= 31;
  }, "Selecciona un máximo de 32 días.");

export const listarHistorial = asyncHandler(async (req, res) => {
  res.json(await consultarHistorial(req.userId!, leerSesion(filtros, req.query)));
});

export const verActividad = asyncHandler(async (req, res) => {
  const { semana, mes, hoy, desde, hasta } = leerSesion(actividad, req.query);
  res.json(await actividadHistorial(req.userId!, semana, mes, hoy, desde, hasta));
});

export const verDetalle = asyncHandler(async (req, res) => {
  res.json(await detalleHistorial(req.userId!, leerSesion(idSesion, req.params.id)));
});

export const repetirHistorial = asyncHandler(async (req, res) => {
  const origen = leerSesion(idSesion, req.params.id);
  const { id } = leerSesion(z.object({ id: idSesion }).strict(), req.body);
  if (id === origen) throw new AppError(400, "Usa un identificador nuevo para repetir la sesión.");
  const usuarioId = req.userId!;
  const { sesion } = await detalleHistorial(usuarioId, origen, false);
  const contenido = leerSesion(contenidoSesion, {
    ...sesion, notas: "", ejercicios: sesion.ejercicios.map((item) => ({
      ...item, series: item.series.map((serie) => ({ ...serie, completada: false })),
    })),
  });
  const nueva = await sesionesEntrenamiento.iniciar(usuarioId, id, contenido);
  if (nueva.estado !== "en_curso") throw new AppError(409, "La sesión ya se cerró. Vuelve a iniciar desde el historial.");
  res.json({ sesion: nueva });
});

export const compararHistorial = asyncHandler(async (req, res) => {
  const { anterior, reciente } = leerSesion(z.object({ anterior: idSesion, reciente: idSesion }).strict()
    .refine((value) => value.anterior !== value.reciente, "Selecciona dos entrenamientos distintos."), req.query);
  const [a, b] = await Promise.all([detalleHistorial(req.userId!, anterior), detalleHistorial(req.userId!, reciente)]);
  res.json({ ...prepararComparacion(a, b), anterior: a.nombre, reciente: b.nombre });
});

const rangoInicio = z.object({ desde: fecha, hasta: fecha }).strict().refine(({ desde, hasta }) =>
  desde <= hasta && Date.parse(hasta) - Date.parse(desde) <= 27 * 86400000,
  "Selecciona un máximo de 28 días.");

export const verResumenInicio = asyncHandler(async (req, res) => {
  const { desde, hasta } = leerSesion(rangoInicio, req.query);
  res.set("Cache-Control", "private, no-store");
  res.json(await resumenInicio(req.userId!, desde, hasta));
});
