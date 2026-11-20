import httpClient from '../../../lib/api/httpClient';

export const guardarMetricasHoy = async (datos) => {
  return await httpClient.post('/particular/metrics', datos);
};

export const obtenerMetricasHoy = async () => {
  return await httpClient.get('/particular/metrics/hoy');
};