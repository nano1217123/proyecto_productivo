import { Router } from 'express';
import * as particularController from '../controller/particular.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
// import { validate } from '../middleware/validate.middleware';
// import { guardarMetricasSchema } from '../validator/particular.validator';

const router = Router();

router.use(requireAuth);

// router.post('/metrics', validate(guardarMetricasSchema), particularController.guardarMetricas);
router.post('/metrics', particularController.guardarMetricas); 
router.get('/metrics/hoy', particularController.getMetricasHoy);

export default router;