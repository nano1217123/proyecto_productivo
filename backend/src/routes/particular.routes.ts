import { Router } from 'express';
import * as particularController from '../controller/particular.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateGuardarMetricas } from '../validator/particular.validator.js';

const router = Router();

router.use(requireAuth);

router.post('/metrics', validateGuardarMetricas, particularController.guardarMetricas);
router.get('/metrics/hoy', particularController.getMetricasHoy);

export default router;
