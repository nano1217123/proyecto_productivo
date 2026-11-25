import { asyncHandler } from '../middleware/error.middleware.js';
import * as particularService from '../service/particular.service.js';
import type { MetricasValidadas } from '../validator/particular.validator.js';

export function createParticularController(modoDiario: boolean) {
  return {
    guardarMetricas: asyncHandler(async (req, res) => {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
      }

      const result = modoDiario
        ? await particularService.guardarProgresoDiario(req.userId, res.locals.metricas)
        : await particularService.registrarProgreso(req.userId, res.locals.metricas as MetricasValidadas);
      res.status(201).json({ success: true, data: result });
    }),
    getMetricasHoy: asyncHandler(async (req, res) => {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
      }

      const result = modoDiario
        ? await particularService.consultarProgresoDiario(req.userId)
        : await particularService.consultarProgresoHoy(req.userId);
      res.status(200).json({ success: true, data: result });
    }),
  };
}
