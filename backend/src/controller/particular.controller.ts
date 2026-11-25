import { asyncHandler } from '../middleware/error.middleware.js';
import * as particularService from '../service/particular.service.js';
import type { MetricasValidadas } from '../validator/particular.validator.js';

export function createParticularController(modoDiario: boolean) {
  return {
    guardarMetricas: asyncHandler(async (req, res) => {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
      }

      if (modoDiario) {
        const resultado = await particularService.guardarProgresoDiario(req.userId, res.locals.metricas);
        if (resultado.conflicto) {
          return res.status(409).json({
            success: false,
            codigo: 'DIA_METRICAS_CAMBIO',
            message: 'Cambió el día de las métricas. Revisa tus cambios antes de guardar.',
            diaLocal: resultado.diaLocal,
          });
        }
        return res.status(201).json({ success: true, data: resultado.data, diaLocal: resultado.diaLocal });
      }

      const result = await particularService.registrarProgreso(req.userId, res.locals.metricas as MetricasValidadas);
      res.status(201).json({ success: true, data: result });
    }),
    getMetricasHoy: asyncHandler(async (req, res) => {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
      }

      if (modoDiario) {
        const { data, diaLocal } = await particularService.consultarProgresoDiario(req.userId);
        return res.set('Cache-Control', 'no-store').status(200).json({
          success: true,
          data,
          capacidades: { actualizacionParcial: true },
          diaLocal,
        });
      }

      const result = await particularService.consultarProgresoHoy(req.userId);
      res.status(200).json({ success: true, data: result });
    }),
  };
}
