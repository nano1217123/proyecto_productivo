import { z } from 'zod';
import type { RequestHandler } from 'express';

export const pesoCorporal = z.number().min(20).max(300);

const camposMetricas = z.object({
  pesoActualKg: pesoCorporal.optional(),
  vasosAgua: z.number().int().min(0).max(20),
  entrenamientoCompletado: z.boolean(),
});

export const guardarMetricasSchema = z.object({
  body: camposMetricas.extend({
    vasosAgua: camposMetricas.shape.vasosAgua.default(0),
    entrenamientoCompletado: camposMetricas.shape.entrenamientoCompletado.default(false),
  }),
});
export const actualizarMetricasSchema = z.object({
  body: camposMetricas.partial().extend({ diaEsperado: z.iso.date() }).refine(
    ({ pesoActualKg, vasosAgua, entrenamientoCompletado }) =>
      pesoActualKg !== undefined || vasosAgua !== undefined || entrenamientoCompletado !== undefined,
    { message: 'Envía al menos una métrica.' },
  ),
});
export type MetricasValidadas = z.output<typeof guardarMetricasSchema>['body'];
export type ActualizacionDiaria = z.output<typeof actualizarMetricasSchema>['body'];
export type MetricasParciales = Omit<ActualizacionDiaria, 'diaEsperado'>;

export const validarMetricas = (modoDiario: boolean): RequestHandler => (req, res, next) => {
  const schema = modoDiario ? actualizarMetricasSchema : guardarMetricasSchema;
  const resultado = schema.safeParse({ body: req.body });
  if (!resultado.success) {
    res.status(400).json({ success: false, message: 'Las métricas enviadas no son válidas.' });
    return;
  }

  res.locals.metricas = resultado.data.body;
  next();
};
