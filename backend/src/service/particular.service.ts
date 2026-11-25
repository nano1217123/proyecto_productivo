import * as particularRepo from '../repositories/particular.repository.js';
import type { MetricasValidadas } from '../validator/particular.validator.js';

export const registrarProgreso = async (usuarioId: string, data: MetricasValidadas) => {
  return await particularRepo.crearMetrica(usuarioId, data);
};

export const consultarProgresoHoy = async (usuarioId: string) => {
  return await particularRepo.obtenerMetricasHoy(usuarioId);
};
