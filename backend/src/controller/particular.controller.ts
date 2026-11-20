import { Request, Response } from 'express';
import * as particularService from '../service/particular.service.js'; // 👈 Agregamos el .js
export const guardarMetricas = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.idusuario; // Viene del middleware requireAuth
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
    }
    const result = await particularService.registrarProgreso(userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMetricasHoy = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.idusuario;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado. Falta el token o usuario.' });
    }
    const result = await particularService.consultarProgresoHoy(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};