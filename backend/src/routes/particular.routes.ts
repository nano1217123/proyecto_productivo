import { Router } from 'express';
import { createParticularController } from '../controller/particular.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validarMetricas } from '../validator/particular.validator.js';

export function createParticularRouter(
  modoDiario = process.env.PARTICULAR_METRICAS_DIARIAS === 'true',
) {
  const router = Router();
  const controller = createParticularController(modoDiario);

  router.use(requireAuth);
  router.post('/metrics', validarMetricas(modoDiario), controller.guardarMetricas);
  router.get('/metrics/hoy', controller.getMetricasHoy);

  return router;
}

export default createParticularRouter();
