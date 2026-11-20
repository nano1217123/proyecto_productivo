import { z } from 'zod';

export const guardarMetricasSchema = z.object({
  body: z.object({
    pesoActualKg: z.number().min(20).max(300).optional(),
    vasosAgua: z.number().int().min(0).max(20).default(0),
    entrenamientoCompletado: z.boolean().default(false),
  }),
});