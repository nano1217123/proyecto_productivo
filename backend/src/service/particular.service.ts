import * as particularRepo from '../repositories/particular.repository.js';
import type { ActualizacionDiaria, MetricasValidadas } from '../validator/particular.validator.js';

export const registrarProgreso = async (usuarioId: string, data: MetricasValidadas) => {
  return await particularRepo.crearMetrica(usuarioId, data);
};

export const consultarProgresoHoy = async (usuarioId: string) => {
  return await particularRepo.obtenerMetricasHoy(usuarioId);
};

const calendarioBogota = new Intl.DateTimeFormat('en', {
  timeZone: 'America/Bogota',
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function diaEnBogota(instante: Date) {
  const partes = calendarioBogota.formatToParts(instante);
  const valor = (tipo: 'year' | 'month' | 'day') => partes.find((parte) => parte.type === tipo)!.value;
  return `${valor('year').padStart(4, '0')}-${valor('month')}-${valor('day')}`;
}

export async function guardarProgresoDiario(usuarioId: string, { diaEsperado, ...metricas }: ActualizacionDiaria) {
  const instante = new Date();
  const diaLocal = diaEnBogota(instante);
  if (diaEsperado !== diaLocal) return { conflicto: true as const, diaLocal };

  const data = await particularRepo.guardarMetricaDiaria(usuarioId, metricas, instante, diaLocal);
  return { conflicto: false as const, diaLocal, data };
}

export async function consultarProgresoDiario(usuarioId: string) {
  const diaLocal = diaEnBogota(new Date());
  const data = await particularRepo.obtenerMetricaDiaria(usuarioId, diaLocal);
  return { diaLocal, data };
}
