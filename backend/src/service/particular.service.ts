import * as particularRepo from '../repositories/particular.repository.js'; // 👈 Agregamos el .js
export const registrarProgreso = async (usuarioId: string, data: any) => {
  return await particularRepo.crearMetrica(usuarioId, data);
};

export const consultarProgresoHoy = async (usuarioId: string) => {
  return await particularRepo.obtenerMetricasHoy(usuarioId);
};