import { catalogoHistorico, filasSesion } from "./trainingHistoryData.js";
import { contenidoSesion, tipoRegistro, type ContenidoSesion } from "../validator/sesionEntrenamiento.validator.js";
import { tiposConVolumen, volumenRegistrado } from "../service/volumenEntrenamiento.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/AppError.js";

export type FiltrosHistorial = {
  pagina: number; buscar?: string; desde?: string; hasta?: string; grupo?: string;
  ejercicio?: string; rutina?: string; duracion?: number; records?: boolean;
  orden: "recientes" | "antiguos" | "larga" | "corta" | "volumen";
};

export const duracion = Prisma.sql`CASE WHEN e.iniciado_en <= e.finalizado_en
  THEN floor(extract(epoch FROM e.finalizado_en - e.iniciado_en))::int END`;

// Las cargas se almacenan en kg. El volumen conserva la convención registrada,
// sin multiplicadores inferidos para mancuernas o movimientos unilaterales.
export const cargaValida = Prisma.sql`s.peso_kg >= 0 AND s.repeticiones > 0 AND coalesce(s.tipo, 'fuerza') IN (${Prisma.join(tiposConVolumen.map((tipo) => Prisma.sql`${tipo}`))})`;

export const nombreEjercicio = Prisma.sql`coalesce(e.catalogo_historico->s.ejercicio_id::text->>'nombre', j.nombre)`;
export const grupoEjercicio = Prisma.sql`coalesce(e.catalogo_historico->s.ejercicio_id::text->>'grupo', j.grupo_nombre)`;

const marcas = (usuarioId: string) => Prisma.sql`marcas AS (
      SELECT e.id, s.ejercicio_id, coalesce(s.tipo, 'fuerza') AS tipo, max(s.peso_kg) AS peso,
        e.fecha, e.creado_en
      FROM entrenamientos e JOIN series_entrenamiento s ON s.entrenamiento_id = e.id
      WHERE e.usuario_id = ${usuarioId}::uuid AND s.usuario_id = e.usuario_id AND e.estado = 'finalizado' AND ${cargaValida}
      GROUP BY e.id, s.ejercicio_id, coalesce(s.tipo, 'fuerza')
    ), marcas_ordenadas AS (
      SELECT id, ejercicio_id, tipo, peso::float8, (max(peso) OVER (
        PARTITION BY ejercicio_id, tipo ORDER BY fecha, creado_en, id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ))::float8 AS anterior
      FROM marcas
    ), mejoras AS (
      SELECT id, ejercicio_id, tipo, peso, anterior FROM marcas_ordenadas WHERE peso > anterior
    )`;

export async function consultarHistorial(usuarioId: string, filtros: FiltrosHistorial, limite = 20) {
  const condiciones = [
    filtros.desde && Prisma.sql`e.fecha >= ${filtros.desde}::date`,
    filtros.hasta && Prisma.sql`e.fecha <= ${filtros.hasta}::date`,
    filtros.duracion !== undefined && Prisma.sql`(${duracion}) >= ${(filtros.duracion ?? 0) * 60}`,
    filtros.rutina && Prisma.sql`strpos(lower(e.rutina_origen->>'nombre'), lower(${filtros.rutina})) > 0`,
    filtros.grupo && Prisma.sql`EXISTS (SELECT 1 FROM series_entrenamiento s JOIN ejercicios j ON j.id = s.ejercicio_id
      WHERE s.entrenamiento_id = e.id AND strpos(lower(${grupoEjercicio}), lower(${filtros.grupo})) > 0)`,
    filtros.ejercicio && Prisma.sql`EXISTS (SELECT 1 FROM series_entrenamiento s JOIN ejercicios j ON j.id = s.ejercicio_id
      WHERE s.entrenamiento_id = e.id AND strpos(lower(${nombreEjercicio}), lower(${filtros.ejercicio})) > 0)`,
    filtros.buscar && Prisma.sql`(strpos(lower(coalesce(e.nombre, 'Entrenamiento')), lower(${filtros.buscar})) > 0
      OR strpos(lower(e.rutina_origen->>'nombre'), lower(${filtros.buscar})) > 0
      OR EXISTS (SELECT 1 FROM series_entrenamiento s JOIN ejercicios j ON j.id = s.ejercicio_id
        WHERE s.entrenamiento_id = e.id AND strpos(lower(${nombreEjercicio}), lower(${filtros.buscar})) > 0))`,
  ].filter((condicion): condicion is Prisma.Sql => !!condicion);
  const orden = {
    recientes: Prisma.sql`fecha DESC, "creadoEn" DESC`,
    antiguos: Prisma.sql`fecha ASC, "creadoEn" ASC`,
    larga: Prisma.sql`duracion DESC NULLS LAST, fecha DESC`,
    corta: Prisma.sql`duracion ASC NULLS LAST, fecha DESC`,
    volumen: Prisma.sql`CASE WHEN convenciones = 1 AND tipos = ARRAY['fuerza']::text[] THEN volumen END DESC NULLS LAST, fecha DESC`,
  }[filtros.orden];
  const paginaPrimero = !filtros.records && filtros.orden !== "volumen";
  const pagina = Prisma.sql`LIMIT ${limite + 1} OFFSET ${(filtros.pagina - 1) * limite}`;
  const filas = await prisma.$queryRaw<unknown[]>(Prisma.sql`
    WITH sesiones AS (
      SELECT e.id, e.fecha::text, e.creado_en AS "creadoEn", e.iniciado_en AS "iniciadoEn",
        e.nombre, e.catalogo_historico, e.rutina_origen AS rutina, jsonb_array_length(e.sesion->'ejercicios') AS ejercicios, ${duracion} AS duracion
      FROM entrenamientos e
      WHERE e.usuario_id = ${usuarioId}::uuid AND e.estado = 'finalizado'
      ${condiciones.length ? Prisma.sql`AND ${Prisma.join(condiciones, " AND ")}` : Prisma.empty}
      ${paginaPrimero ? Prisma.sql`ORDER BY ${orden}, id DESC ${pagina}` : Prisma.empty}
    ), ${marcas(usuarioId)}, resumen AS (
      SELECT e.id, e.fecha, e."creadoEn", e."iniciadoEn", e.nombre, e.rutina, e.duracion, count(s.id)::int AS series, coalesce(e.ejercicios, count(DISTINCT s.ejercicio_id)::int) AS ejercicios,
        sum(s.peso_kg * s.repeticiones) FILTER (WHERE ${cargaValida})::float8 AS volumen,
        count(DISTINCT coalesce(s.tipo, 'fuerza')) FILTER (WHERE ${cargaValida})::int AS convenciones,
        array_agg(DISTINCT coalesce(s.tipo, 'fuerza')) FILTER (WHERE ${cargaValida}) AS tipos,
        coalesce(array_agg(DISTINCT ${grupoEjercicio}) FILTER (WHERE j.id IS NOT NULL), '{}') AS grupos,
        (SELECT count(*)::int FROM mejoras m WHERE m.id = e.id) AS records
      FROM sesiones e LEFT JOIN series_entrenamiento s ON s.entrenamiento_id = e.id AND s.usuario_id = ${usuarioId}::uuid
      LEFT JOIN ejercicios j ON j.id = s.ejercicio_id
      GROUP BY e.id, e.fecha, e."creadoEn", e."iniciadoEn", e.nombre, e.rutina, e.duracion, e.ejercicios, e.catalogo_historico
    )
    SELECT * FROM resumen ${filtros.records ? Prisma.sql`WHERE records > 0` : Prisma.empty}
    ORDER BY ${orden}, id DESC ${paginaPrimero ? Prisma.empty : pagina}
  `);
  return { entrenamientos: filas.slice(0, limite), siguiente: filas.length > limite };
}

export async function actividadHistorial(usuarioId: string, semana: string, mes: string, hoy: string, desde: string, hasta: string) {
  const [resumen, dias, grupos] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE e.fecha BETWEEN ${semana}::date AND ${hoy}::date)::int AS semana,
        count(*) FILTER (WHERE e.fecha BETWEEN ${mes}::date AND ${hoy}::date)::int AS mes,
        sum(${duracion})::float8 AS tiempo, avg(${duracion})::float8 AS promedio,
        count(DISTINCT e.fecha)::int AS dias
      FROM entrenamientos e WHERE e.usuario_id = ${usuarioId}::uuid AND e.estado = 'finalizado'
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT fecha::text, count(*)::int AS sesiones FROM entrenamientos
      WHERE usuario_id = ${usuarioId}::uuid AND estado = 'finalizado' AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      GROUP BY fecha ORDER BY fecha
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT ${grupoEjercicio} AS grupo, count(*)::int AS series
      FROM entrenamientos e JOIN series_entrenamiento s ON s.entrenamiento_id = e.id
      JOIN ejercicios j ON j.id = s.ejercicio_id
      WHERE e.usuario_id = ${usuarioId}::uuid AND e.estado = 'finalizado'
      GROUP BY ${grupoEjercicio} ORDER BY series DESC, grupo
    `),
  ]);
  return { resumen: (resumen as unknown[])[0], dias, grupos };
}

export async function detalleHistorial(usuarioId: string, id: string, incluirMejoras = true) {
  const registro = await prisma.entrenamiento.findFirst({
    where: { id, usuarioId, estado: "finalizado" },
    include: { seriesEntrenamiento: {
      orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
      include: { ejercicio: true },
    } },
  });
  if (!registro) throw new AppError(404, "Entrenamiento no encontrado.");
  const marcasSesion = incluirMejoras ? await prisma.$queryRaw<{
    ejercicio_id: number; tipo: string; peso: number; anterior: number | null;
  }[]>(Prisma.sql`
    WITH ${marcas(usuarioId)}
    SELECT ejercicio_id::float8, tipo, peso, anterior FROM marcas_ordenadas
    WHERE id = ${id}::uuid AND (anterior IS NULL OR peso > anterior)
  `) : [];
  const mejoras = marcasSesion.filter((marca) => marca.anterior !== null);
  const primerasMarcas = marcasSesion.filter((marca) => marca.anterior === null);
  const parsed = contenidoSesion.safeParse(registro.sesion);
  const series = registro.seriesEntrenamiento;
  const ejercicios: ContenidoSesion["ejercicios"] = parsed.success ? parsed.data.ejercicios : [];
  if (!parsed.success) {
    for (const serie of series) {
      const ejercicio_id = Number(serie.ejercicioId);
      const tipo = tipoRegistro.safeParse(serie.tipo).data ?? (serie.pesoKg === null ? "corporal" : "fuerza");
      const anterior = ejercicios.at(-1);
      const item = anterior?.ejercicio_id === ejercicio_id && anterior.tipo === tipo &&
        serie.numeroSerie > 1 && anterior.series.length < 30 ? anterior : { ejercicio_id, tipo, descanso: 0, notas: "", series: [] };
      if (item !== anterior) ejercicios.push(item);
      item.series.push({
        completada: true, peso_kg: serie.pesoKg === null ? null : Number(serie.pesoKg), repeticiones: serie.repeticiones,
        duracion_seg: serie.duracionSeg, distancia_km: serie.distanciaKm === null ? null : Number(serie.distanciaKm),
        asistencia_kg: serie.asistenciaKg === null ? null : Number(serie.asistenciaKg),
      });
    }
  }
  const catalogo = Object.fromEntries(series.map(({ ejercicio }) => [String(ejercicio.id), {
    nombre: ejercicio.nombre, grupo: ejercicio.grupoNombre, musculo: ejercicio.musculoPrincipal,
    equipo: ejercicio.equipo, imagen: ejercicio.imagenUrl,
  }]));
  return {
    id, fecha: registro.fecha.toISOString().slice(0, 10), nombre: registro.nombre,
    notas: registro.notas, iniciadoEn: registro.iniciadoEn, finalizadoEn: registro.finalizadoEn,
    volumenPorEjercicio: ejercicios.map((item) => volumenRegistrado(item.series, item.tipo)),
    mejoras, primerasMarcas, estado: registro.estado, revision: registro.revision, creadoEn: registro.creadoEn,
    sesion: { nombre: registro.nombre || "Entrenamiento", notas: registro.notas || "", ejercicios },
    rutina: registro.rutinaOrigen, actualizadoEn: registro.actualizadoEn,
    catalogo: { ...catalogo, ...(registro.catalogoHistorico as typeof catalogo | null) },
  };
}

export async function corregirDetalle(usuarioId: string, id: string, revision: number, fecha: string, contenido: ContenidoSesion) {
  await prisma.$transaction(async (tx) => {
    const anterior = await tx.entrenamiento.findFirst({
      where: { id, usuarioId, estado: "finalizado" },
      select: { catalogoHistorico: true },
    });
    if (!anterior) throw new AppError(404, "Entrenamiento no encontrado.");
    const catalogo = await catalogoHistorico(tx, contenido);
    if (contenido.ejercicios.some((item) => !Object.hasOwn(catalogo, String(item.ejercicio_id)))) {
      throw new AppError(400, "Hay ejercicios que no están en el catálogo.");
    }
    const snapshot = Object.fromEntries(Object.keys(catalogo).map((key) => [
      key, (anterior.catalogoHistorico as typeof catalogo | null)?.[key] ?? catalogo[key],
    ]));
    const resultado = await tx.entrenamiento.updateMany({
      where: { id, usuarioId, estado: "finalizado", revision },
      data: {
        revision: { increment: 1 }, fecha: new Date(fecha), nombre: contenido.nombre, notas: contenido.notas,
        sesion: contenido, catalogoHistorico: snapshot, actualizadoEn: new Date(),
      },
    });
    if (!resultado.count) throw new AppError(409, "El entrenamiento cambió. Carga su detalle antes de volver a editar.");
    await tx.serieEntrenamiento.deleteMany({ where: { entrenamientoId: id, usuarioId } });
    await tx.serieEntrenamiento.createMany({ data: filasSesion(usuarioId, id, contenido.ejercicios) });
  });
}

export async function resumenInicio(usuarioId: string, desde: string, hasta: string) {
  const [historial, dias, totales] = await Promise.all([
    consultarHistorial(usuarioId, { pagina: 1, orden: "recientes", hasta }, 1),
    prisma.$queryRaw<Array<{ fecha: string; sesiones: number; tiempo: number | null; series: number }>>(Prisma.sql`
      SELECT e.fecha::text, count(*)::int AS sesiones, sum(${duracion})::float8 AS tiempo,
        coalesce(sum(series.total), 0)::int AS series
      FROM entrenamientos e
      LEFT JOIN LATERAL (SELECT count(*) AS total FROM series_entrenamiento s
        WHERE s.entrenamiento_id = e.id AND s.usuario_id = e.usuario_id) series ON true
      WHERE e.usuario_id = ${usuarioId}::uuid AND e.estado = 'finalizado'
        AND e.fecha BETWEEN ${desde}::date AND ${hasta}::date
      GROUP BY e.fecha ORDER BY e.fecha
    `),
    prisma.entrenamiento.count({ where: { usuarioId, estado: "finalizado", fecha: { lte: new Date(hasta) } } }),
  ]);
  return { ultimo: historial.entrenamientos[0] ?? null, dias, total: totales };
}
