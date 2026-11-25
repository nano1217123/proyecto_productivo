import { asyncHandler } from '../middleware/error.middleware.js';
import * as particularService from '../service/particular.service.js';
import type { MetricasValidadas } from '../validator/particular.validator.js';

export const guardarMetricas = asyncHandler(async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
  }

  const metricas: MetricasValidadas = res.locals.metricas;
  const result = await particularService.registrarProgreso(req.userId, metricas);
  res.status(201).json({ success: true, data: result });
});

export const getMetricasHoy = asyncHandler(async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
  }

  const result = await particularService.consultarProgresoHoy(req.userId);
  res.status(200).json({ success: true, data: result });
});
