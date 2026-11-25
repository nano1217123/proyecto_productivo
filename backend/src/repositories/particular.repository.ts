import { prisma } from '../lib/prisma.js';
import { generateId } from '../lib/uuid.js';
import type { MetricasParciales, MetricasValidadas } from '../validator/particular.validator.js';

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

type Metrica = Awaited<ReturnType<typeof crearMetrica>>;

export async function guardarMetricaDiaria(usuarioId: string, metricas: MetricasParciales, instante: Date) {
  const { pesoActualKg, vasosAgua, entrenamientoCompletado } = metricas;
  const fecha = instante.toISOString();
  const [metrica] = await prisma.$queryRaw<Metrica[]>`
    INSERT INTO metricas_diarias AS actual (
      id, usuario_id, fecha, dia_local, peso_actual_kg, vasos_agua, entrenamiento_completado
    )
    VALUES (
      ${generateId()}::uuid, ${usuarioId}::uuid, ${fecha}::timestamptz,
      (${fecha}::timestamptz AT TIME ZONE 'America/Bogota')::date,
      ${pesoActualKg ?? null}::double precision, ${vasosAgua ?? 0}::integer,
      ${entrenamientoCompletado ?? false}::boolean
    )
    ON CONFLICT (usuario_id, dia_local) DO UPDATE SET
      peso_actual_kg = CASE WHEN ${pesoActualKg !== undefined}::boolean
        THEN EXCLUDED.peso_actual_kg ELSE actual.peso_actual_kg END,
      vasos_agua = CASE WHEN ${vasosAgua !== undefined}::boolean
        THEN EXCLUDED.vasos_agua ELSE actual.vasos_agua END,
      entrenamiento_completado = CASE WHEN ${entrenamientoCompletado !== undefined}::boolean
        THEN EXCLUDED.entrenamiento_completado ELSE actual.entrenamiento_completado END
    RETURNING id, usuario_id AS "usuarioId", fecha, peso_actual_kg AS "pesoActualKg",
      vasos_agua AS "vasosAgua", entrenamiento_completado AS "entrenamientoCompletado"
  `;
  if (!metrica) throw new Error('El guardado diario no devolvió una métrica.');
  return metrica;
}

export async function obtenerMetricaDiaria(usuarioId: string, instante: Date) {
  const [metrica] = await prisma.$queryRaw<Metrica[]>`
    SELECT id, usuario_id AS "usuarioId", fecha, peso_actual_kg AS "pesoActualKg",
      vasos_agua AS "vasosAgua", entrenamiento_completado AS "entrenamientoCompletado"
    FROM metricas_diarias
    WHERE usuario_id = ${usuarioId}::uuid
      AND dia_local = (${instante.toISOString()}::timestamptz AT TIME ZONE 'America/Bogota')::date
  `;
  return metrica ?? null;
}
