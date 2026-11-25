import { prisma } from '../lib/prisma.js';
import type { MetricasValidadas } from '../validator/particular.validator.js';

export const crearMetrica = async (usuarioId: string, data: MetricasValidadas) => {
  return await prisma.metricaDiaria.create({
    data: {
      usuarioId,
      pesoActualKg: data.pesoActualKg,
      vasosAgua: data.vasosAgua,
      entrenamientoCompletado: data.entrenamientoCompletado,
    }
  });
};

export const obtenerMetricasHoy = async (usuarioId: string) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  return await prisma.metricaDiaria.findFirst({
    where: {
      usuarioId,
      fecha: { gte: hoy }
    }
  });
};
