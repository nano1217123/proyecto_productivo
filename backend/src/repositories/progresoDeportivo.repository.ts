import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { cargaValida, duracion, grupoEjercicio, nombreEjercicio } from "./historial.repository.js";

const sesiones = (usuarioId: string) => Prisma.sql`e.usuario_id = ${usuarioId}::uuid AND e.estado = 'finalizado'`;
const periodo = (desde: string | undefined, hasta: string) => Prisma.sql`
  e.fecha <= ${hasta}::date ${desde ? Prisma.sql`AND e.fecha >= ${desde}::date` : Prisma.empty}`;
const series = Prisma.sql`JOIN series_entrenamiento s ON s.entrenamiento_id = e.id AND s.usuario_id = e.usuario_id`;
const catalogo = Prisma.sql`JOIN ejercicios j ON j.id = s.ejercicio_id`;
const tipo = Prisma.sql`coalesce(s.tipo, CASE WHEN s.peso_kg IS NULL THEN 'corporal' ELSE 'fuerza' END)`;

type Actividad = {
  sesiones: number; tiempo: number | null; promedio: number | null;
  semana: number; mes: number; primero: string | null;
};
type Marca = {
  id: string; ejercicio: string; tipo: string; reps: number; valor: number; anterior: number | null; fecha: string;
};

export async function consultarDeporte(usuarioId: string, desde: string | undefined, hasta: string) {
  const propietario = sesiones(usuarioId);
  const rango = periodo(desde, hasta);
  const [actividad, frecuencia, grupos, ejercicios, marcas] = await Promise.all([
    prisma.$queryRaw<Actividad[]>`
      SELECT count(*) FILTER (WHERE ${rango})::int AS sesiones,
        sum(${duracion}) FILTER (WHERE ${rango})::float8 AS tiempo,
        avg(${duracion}) FILTER (WHERE ${rango})::float8 AS promedio,
        min(e.fecha) FILTER (WHERE ${rango})::text AS primero,
        count(*) FILTER (WHERE e.fecha >= date_trunc('week', ${hasta}::date))::int AS semana,
        count(*) FILTER (WHERE e.fecha >= date_trunc('month', ${hasta}::date))::int AS mes
      FROM entrenamientos e WHERE ${propietario} AND e.fecha <= ${hasta}::date
    `,
    prisma.$queryRaw<Array<{ fecha: string; sesiones: number }>>`
      SELECT date_trunc('week', e.fecha)::date::text AS fecha, count(*)::int AS sesiones
      FROM entrenamientos e WHERE ${propietario} AND ${rango} GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw<Array<{ grupo: string; series: number; volumen: number | null; adicional: number | null }>>`
      SELECT ${grupoEjercicio} AS grupo, count(*)::int AS series,
        sum(s.peso_kg * s.repeticiones) FILTER (WHERE ${cargaValida} AND ${tipo} = 'fuerza')::float8 AS volumen,
        sum(s.peso_kg * s.repeticiones) FILTER (WHERE ${cargaValida} AND ${tipo} = 'carga_adicional')::float8 AS adicional
      FROM entrenamientos e ${series} ${catalogo}
      WHERE ${propietario} AND ${rango} GROUP BY 1 ORDER BY series DESC, grupo
    `,
    prisma.$queryRaw<Array<{ id: string; nombre: string; grupo: string; imagen: string | null }>>`
      SELECT j.id::text, j.nombre, coalesce(j.musculo_principal, j.grupo_nombre) AS grupo, j.imagen_url AS imagen
      FROM ejercicios j WHERE EXISTS (
        SELECT 1 FROM series_entrenamiento s JOIN entrenamientos e ON e.id = s.entrenamiento_id
        WHERE s.usuario_id = ${usuarioId}::uuid AND s.ejercicio_id = j.id AND ${propietario} AND ${rango}
      ) ORDER BY j.nombre, j.id
    `,
    prisma.$queryRaw<Array<Marca & { total: number }>>`
      WITH mejores AS (
        SELECT e.id, e.fecha, e.creado_en, s.ejercicio_id, ${nombreEjercicio} AS ejercicio, ${tipo} AS tipo,
          s.repeticiones AS reps, max(s.peso_kg)::float8 AS valor
        FROM entrenamientos e ${series} ${catalogo}
        WHERE ${propietario} AND e.fecha <= ${hasta}::date AND ${cargaValida}
        GROUP BY 1, 2, 3, 4, 5, 6, 7
      ), ordenadas AS (
        SELECT *, max(valor) OVER (
          PARTITION BY ejercicio_id, tipo, reps ORDER BY fecha, creado_en, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS anterior
        FROM mejores
      ), destacadas AS (
        SELECT * FROM ordenadas e WHERE ${rango} AND (anterior IS NULL OR valor > anterior)
      )
      SELECT id, fecha::text, ejercicio, tipo, reps, valor, anterior,
        count(*) FILTER (WHERE anterior IS NOT NULL) OVER ()::int AS total
      FROM destacadas ORDER BY (anterior IS NULL), fecha DESC, creado_en DESC, id, ejercicio_id, tipo, reps LIMIT 12
    `,
  ]);
  return { actividad: actividad[0], frecuencia, grupos, ejercicios, marcas, records: marcas[0]?.total ?? 0 };
}

export async function consultarEjercicio(usuarioId: string, id: number, desde: string | undefined, hasta: string) {
  return prisma.$queryRaw<Array<{
    fecha: string; sesion: string; tipo: string; reps: number | null; peso: number | null;
    distancia: number | null; duracion: number | null; asistencia: number | null;
  }>>`
    SELECT e.fecha::text, e.id AS sesion, ${tipo} AS tipo, s.repeticiones AS reps,
      s.peso_kg::float8 AS peso, s.distancia_km::float8 AS distancia,
      s.duracion_seg AS duracion, s.asistencia_kg::float8 AS asistencia
    FROM entrenamientos e ${series}
    WHERE ${sesiones(usuarioId)} AND ${periodo(desde, hasta)} AND s.ejercicio_id = ${id}::bigint
    ORDER BY e.fecha DESC, e.creado_en DESC, e.id DESC, s.numero_serie, s.id LIMIT 5001
  `;
}
