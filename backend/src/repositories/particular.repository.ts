import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaNeon } from '@prisma/adapter-neon';
import { env } from '../config/env.js';

// Nueva forma correcta en Prisma 7: pasar la configuración directamente
const adapter = new PrismaNeon({
  connectionString: env.databaseUrl,
});

const prisma = new PrismaClient({ adapter });

export const crearMetrica = async (usuarioId: string, data: any) => {
  return await prisma.metricaDiaria.create({
    data: {
      usuarioId,
      ...data
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