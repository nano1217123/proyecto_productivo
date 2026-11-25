import { z } from 'zod';
import type { RequestHandler } from 'express';

export const guardarMetricasSchema = z.object({
  body: z.object({
    pesoActualKg: z.number().min(20).max(300).optional(),
    vasosAgua: z.number().int().min(0).max(20).default(0),
    entrenamientoCompletado: z.boolean().default(false),
  }),
});

export type MetricasValidadas = z.output<typeof guardarMetricasSchema>['body'];

export const validateGuardarMetricas: RequestHandler = (req, res, next) => {
  const resultado = guardarMetricasSchema.safeParse({ body: req.body });
  if (!resultado.success) {
    res.status(400).json({ success: false, message: 'Las métricas enviadas no son válidas.' });
    return;
  }

  res.locals.metricas = resultado.data.body;
  next();
};
