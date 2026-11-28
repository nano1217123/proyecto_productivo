import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export type TipoReportePersonal = "progreso" | "rutinas" | "ejercicios";
export type FiltrosReportePersonal = { desde?: string; hasta?: string };
type EstadoReporte = "ok" | "sin_datos" | "campo" | "filas" | "bytes";
type FilaPersonal = { estado: EstadoReporte; celdas: (string | null)[] | null };

export function consultarReportePersonal(
  usuarioId: string, tipo: TipoReportePersonal, { desde, hasta }: FiltrosReportePersonal,
  maxFilas: number, maxBytes: number,
) {
  const limite = maxFilas + 1;
  const rango = (fecha: Prisma.Sql) => Prisma.sql`
    AND (${desde ?? null}::date IS NULL OR ${fecha} >= ${desde ?? null}::date)
    AND (${hasta ?? null}::date IS NULL OR ${fecha} <= ${hasta ?? null}::date)`;
  const local = (fecha: Prisma.Sql) => Prisma.sql`(${fecha} AT TIME ZONE 'America/Bogota')::date`;
  const acotado = (valor: Prisma.Sql) => Prisma.sql`CASE WHEN octet_length(${valor}) <= 4096 THEN ${valor} END`;
  const consultas = {
    progreso: Prisma.sql`
      SELECT ARRAY[${local(Prisma.sql`m.fecha`)}::text, m.peso_actual_kg::text,
        m.entrenamiento_completado::text] AS celdas, false AS exceso,
        row_number() OVER (ORDER BY m.fecha DESC, m.id DESC) AS orden
      FROM public.metricas_diarias m WHERE m.usuario_id = ${usuarioId}::uuid
      ${rango(local(Prisma.sql`m.fecha`))}
      ORDER BY m.fecha DESC, m.id DESC LIMIT ${limite}`,
    rutinas: Prisma.sql`
      SELECT ARRAY[${local(Prisma.sql`r.creado_en`)}::text,
        CASE WHEN octet_length(r.nombre) <= 4096 THEN r.nombre END,
        CASE WHEN octet_length(r.dia_etiqueta) <= 4096 THEN r.dia_etiqueta END,
        re.orden::text, CASE WHEN octet_length(e.nombre) <= 4096 THEN e.nombre END,
        semana.dias, CASE WHEN r.archivada THEN 'Archivada' ELSE 'Activa' END] AS celdas,
        (coalesce(octet_length(r.nombre), 0) > 4096 OR coalesce(octet_length(r.dia_etiqueta), 0) > 4096
          OR coalesce(octet_length(e.nombre), 0) > 4096) AS exceso,
        row_number() OVER (ORDER BY r.creado_en DESC, r.id DESC, re.orden ASC) AS orden
      FROM public.rutinas r LEFT JOIN public.rutina_ejercicios re ON re.rutina_id = r.id
      LEFT JOIN public.ejercicios e ON e.id = re.ejercicio_id
      CROSS JOIN LATERAL (
        SELECT string_agg(d.nombre, ', ' ORDER BY d.numero) AS dias
        FROM (VALUES (1, 'Lunes'), (2, 'Martes'), (3, 'Miércoles'), (4, 'Jueves'),
                     (5, 'Viernes'), (6, 'Sábado'), (7, 'Domingo')) AS d(numero, nombre)
        WHERE d.numero = ANY(r.dias)
      ) semana
      WHERE r.usuario_id = ${usuarioId}::uuid ${rango(local(Prisma.sql`r.creado_en`))}
      ORDER BY r.creado_en DESC, r.id DESC, re.orden ASC LIMIT ${limite}`,
    ejercicios: Prisma.sql`
      SELECT ARRAY[t.fecha::text, ${acotado(Prisma.sql`datos.nombre`)},
        s.numero_serie::text, s.repeticiones::text,
        ${acotado(Prisma.sql`s.peso_kg::text`)}, ${acotado(Prisma.sql`s.tipo`)}, s.duracion_seg::text,
        ${acotado(Prisma.sql`s.distancia_km::text`)}, ${acotado(Prisma.sql`s.asistencia_kg::text`)}] AS celdas,
        (greatest(octet_length(datos.nombre), octet_length(s.tipo), octet_length(s.peso_kg::text),
          octet_length(s.distancia_km::text), octet_length(s.asistencia_kg::text)) > 4096) AS exceso,
        row_number() OVER (ORDER BY t.fecha DESC, t.id DESC, s.numero_serie, s.id) AS orden
      FROM public.entrenamientos t JOIN public.series_entrenamiento s
        ON s.entrenamiento_id = t.id AND s.usuario_id = t.usuario_id
      JOIN public.ejercicios e ON e.id = s.ejercicio_id
      CROSS JOIN LATERAL (
        SELECT t.catalogo_historico -> (s.ejercicio_id::text) -> 'nombre' AS historico
      ) captura
      CROSS JOIN LATERAL (
        SELECT CASE WHEN jsonb_typeof(captura.historico) = 'string'
          AND btrim(captura.historico #>> '{}') <> '' THEN captura.historico #>> '{}'
          ELSE e.nombre END AS nombre
      ) datos
      WHERE t.usuario_id = ${usuarioId}::uuid AND t.estado = 'finalizado' ${rango(Prisma.sql`t.fecha`)}
      ORDER BY t.fecha DESC, t.id DESC, s.numero_serie, s.id LIMIT ${limite}`,
  };
  return prisma.$queryRaw<FilaPersonal[]>(Prisma.sql`
    WITH candidatas AS MATERIALIZED (${consultas[tipo]}),
    resumen AS (
      SELECT CASE
        WHEN count(*) = 0 THEN 'sin_datos'
        WHEN count(*) > ${maxFilas} THEN 'filas'
        WHEN bool_or(exceso) THEN 'campo'
        WHEN sum((SELECT coalesce(sum(octet_length(valor)), 0)
          FROM unnest(celdas) AS celda(valor))) > ${maxBytes} THEN 'bytes'
        ELSE 'ok'
      END AS estado
      FROM candidatas
    )
    SELECT r.estado, c.celdas FROM resumen r
    LEFT JOIN candidatas c ON r.estado = 'ok'
    ORDER BY c.orden`);
}
