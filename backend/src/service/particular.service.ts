import * as particularRepo from '../repositories/particular.repository.js';
import type { MetricasParciales, MetricasValidadas } from '../validator/particular.validator.js';

export const registrarProgreso = async (usuarioId: string, data: MetricasValidadas) => {
  return await particularRepo.crearMetrica(usuarioId, data);
};

export const consultarProgresoHoy = async (usuarioId: string) => {
  return await particularRepo.obtenerMetricasHoy(usuarioId);
};

export const guardarProgresoDiario = (usuarioId: string, metricas: MetricasParciales) =>
  particularRepo.guardarMetricaDiaria(usuarioId, metricas, new Date());

export const consultarProgresoDiario = (usuarioId: string) =>
  particularRepo.obtenerMetricaDiaria(usuarioId, new Date());
