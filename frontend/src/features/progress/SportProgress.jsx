import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { civilDate, dayKey, minutes, number, weekStart } from "@/src/features/training/hooks/historyDates";
import { useHistoryRequest } from "@/src/features/training/hooks/useHistoryRequest";
import { HomeIcon } from "@/src/features/dashboard/components/HomePanel";
import { ProgressChart, compactDate } from "./ProgressChart";
import { progressApi } from "./progressApi";

const types = {
  fuerza: "Fuerza", carga_adicional: "Carga adicional", corporal: "Peso corporal",
  asistido: "Asistido", cardio: "Cardio", isometrico: "Isométrico",
  movilidad: "Movilidad", estiramiento: "Estiramiento",
};
const metrics = {
  peso: ["Carga", "kg"], reps: ["Repeticiones", "reps"], duracion: ["Duración", "s"],
  distancia: ["Distancia", "km"], asistencia: ["Asistencia", "kg"],
};

export function RequestState({ result, retry, children }) {
  if (result.error) return <div className="progress-feedback" role="alert">
    <p>{result.error}</p><button type="button" onClick={retry}>Reintentar</button>
  </div>;
  if (result.data === undefined) return <p className="progress-empty" role="status">Cargando información…</p>;
  return children(result.data);
}

export function PersonalRecords({ data, url, compact }) {
  return <section className="progress-panel">
    <h2 className="progress-record-title"><HomeIcon name="trophy" /> Récords personales</h2>
    <p className="progress-muted">Cargas comparadas con el mismo ejercicio, tipo y número de repeticiones.</p>
    {!data.marcas.length && <p className="progress-empty">Este periodo todavía no tiene marcas de carga.</p>}
    <ul className="progress-list progress-records">
      {data.marcas.slice(0, compact ? 4 : 12).map((mark) => <li key={`${mark.id}-${mark.ejercicioId ?? mark.ejercicio}-${mark.tipo}-${mark.reps}`}>
        <div><Link href={url("/entrenamientos/historial", { sesion: mark.id })}>{mark.ejercicio}</Link>
          <small>{compactDate(mark.fecha)} · {types[mark.tipo]} · {mark.anterior == null ? "Primera marca" : `Récord · +${number(mark.valor - mark.anterior)} kg`}</small></div>
        <strong>{number(mark.valor)} kg × {mark.reps}</strong>
      </li>)}
    </ul>
  </section>;
}

function buckets(data, range, monthly) {
  const start = range.desde ?? data.actividad.primero;
  if (!start) return [];
  const counts = new Map((monthly ? data.meses : data.frecuencia).map(({ fecha, sesiones }) => [fecha, sesiones]));
  const result = [];
  const date = civilDate(monthly ? start.slice(0, 7) + "-01" : weekStart(start));
  const end = civilDate(range.hasta);
  while (date <= end) {
    const key = dayKey(date);
    result.push({ fecha: key, sesiones: counts.get(key) ?? 0 });
    if (monthly) date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCDate(date.getUTCDate() + 7);
  }
  return result;
}

export function ActivityChart({ data, range, compact, action }) {
  const [monthly, setMonthly] = useState(false);
  const { actividad, grupos } = data;
  const points = buckets(data, range, monthly);
  const weeks = monthly ? buckets(data, range, false).length : points.length;
  const series = grupos.reduce((sum, item) => sum + item.series, 0);
  const force = grupos.filter((item) => item.volumen != null);
  const additional = grupos.filter((item) => item.adicional != null);
  return <section className="progress-panel">
    <div className="progress-section-head">
      <h2>{compact ? "Rendimiento deportivo" : "Mi actividad"}</h2>
      <label>Frecuencia <select value={monthly ? "mes" : "semana"} onChange={(event) => setMonthly(event.target.value === "mes")}>
        <option value="semana">Por semana</option><option value="mes">Por mes</option>
      </select></label>
    </div>
    {!compact && actividad.sesionesAnteriores != null && <p className="progress-muted">Periodo anterior de la misma duración · {actividad.sesionesAnteriores} entrenamientos
      {actividad.tiempoAnterior != null && ` · ${minutes(actividad.tiempoAnterior)} entrenados`}</p>}
    {!actividad.sesiones ? <p className="progress-empty">No hay entrenamientos finalizados en este periodo.</p> : <>
      <div className="progress-sport-totals">
        <div><strong>{actividad.sesiones}</strong><small>Entrenamientos</small></div>
        <div><strong>{number(actividad.sesiones / weeks)}</strong><small>Promedio semanal</small></div>
        {!compact && <>
          <div><strong>{actividad.semana} / {actividad.mes}</strong><small>Esta semana / este mes</small></div>
          <div><strong>{minutes(actividad.promedio)}</strong><small>Duración promedio</small></div>
          <div><strong>{series}</strong><small>Series completadas</small></div>
          {force.length > 0 && <div><strong>{number(force.reduce((sum, item) => sum + item.volumen, 0))} kg</strong><small>Volumen de fuerza</small></div>}
          {additional.length > 0 && <div><strong>{number(additional.reduce((sum, item) => sum + item.adicional, 0))} kg</strong><small>Volumen de carga adicional</small></div>}
        </>}
      </div>
      <div className="progress-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={points} accessibilityLayer>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="fecha" tickFormatter={compactDate} minTickGap={22} stroke="var(--muted)" />
          <YAxis allowDecimals={false} width={35} stroke="var(--muted)" />
          <Tooltip labelFormatter={compactDate} contentStyle={{ background: "var(--surface)", borderColor: "var(--line)" }} />
          <Bar dataKey="sesiones" name="Entrenamientos" fill="var(--green)" radius={[5, 5, 0, 0]} maxBarSize={45} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer></div>
    </>}
    {action}
    {!compact && grupos.length > 0 && <div className="progress-groups">
      <h3>Grupos musculares más registrados</h3>
      {grupos.map(({ grupo, series }) => <div key={grupo}><span>{grupo}</span><small>{series} series</small>
        <progress aria-label={`${grupo}: ${series} series completadas`} value={series} max={grupos[0].series} />
      </div>)}
    </div>}
  </section>;
}

function ExerciseDetails({ rows, exercise }) {
  const [chosenType, setType] = useState("");
  const [chosenMetric, setMetric] = useState("");
  const [chosenReps, setReps] = useState("");
  if (!rows.length) return <p className="progress-empty">No hay series completadas de este ejercicio en el periodo.</p>;
  const recent = rows.slice(0, 5000);
  const availableTypes = [...new Set(recent.map((item) => item.tipo))];
  const type = availableTypes.includes(chosenType) ? chosenType : availableTypes[0];
  const matching = recent.filter((item) => item.tipo === type);
  const availableMetrics = Object.keys(metrics).filter((metric) => matching.some((item) => item[metric] != null));
  const metric = availableMetrics.includes(chosenMetric) ? chosenMetric : availableMetrics[0];
  const repetitions = metric === "peso" || metric === "asistencia"
    ? [...new Set(matching.filter((item) => item[metric] != null).map((item) => item.reps).filter((item) => item != null))]
    : [];
  const reps = repetitions.find((item) => String(item) === chosenReps) ?? repetitions[0];
  const comparable = matching.filter((item) => item[metric] != null && (reps == null || item.reps === reps));
  const [label, unit] = metrics[metric] ?? ["Medida", ""];
  const latest = comparable[0];
  const best = metric && metric !== "asistencia" ? comparable.reduce((max, item) => !max || item[metric] > max[metric] ? item : max, null) : null;
  const trend = new Map();
  for (const item of comparable) {
    const previous = trend.get(item.fecha);
    if (!previous || (metric === "asistencia" ? item[metric] < previous[metric] : item[metric] > previous[metric])) {
      trend.set(item.fecha, item);
    }
  }
  const points = [...trend.values()].reverse().map((item) => ({
    time: Date.parse(item.fecha), value: item[metric], detail: compactDate(item.fecha),
  }));
  return <>
    <div className="progress-exercise-info">
      {exercise.imagen && <img src={exercise.imagen} alt="" width="72" height="72" loading="lazy" />}
      <div><h3>{exercise.nombre}</h3><p>{exercise.grupo} · {new Set(recent.map((item) => item.sesion)).size} sesiones · Última sesión {compactDate(recent[0].fecha)}</p></div>
    </div>
    <div className="progress-actions">
      <label>Tipo <select value={type} onChange={(event) => { setType(event.target.value); setReps(""); setMetric(""); }}>
        {availableTypes.map((item) => <option key={item} value={item}>{types[item] ?? item}</option>)}
      </select></label>
      {availableMetrics.length > 0 && <label>Medida <select value={metric} onChange={(event) => { setMetric(event.target.value); setReps(""); }}>
        {availableMetrics.map((item) => <option key={item} value={item}>{metrics[item][0]}</option>)}
      </select></label>}
      {repetitions.length > 0 && <label>Repeticiones <select value={reps} onChange={(event) => setReps(event.target.value)}>
        {repetitions.map((item) => <option key={item}>{item}</option>)}
      </select></label>}
    </div>
    {latest && <p>Última serie · {number(latest[metric])} {unit}{latest.reps != null && metric !== "reps" ? ` × ${latest.reps} reps` : ""} · {compactDate(latest.fecha)}</p>}
    {best && <p>Máximo registrado · {number(best[metric])} {unit}{reps != null ? ` × ${reps} reps` : ""}</p>}
    {points.length >= 2 && <p className="progress-muted">{metric === "asistencia" ? "Menor asistencia" : "Máximo registrado"} por día.</p>}
    <ProgressChart points={points} label={label} unit={unit} />
    {rows.length > 5000 && <p>Se muestran las 5000 series más recientes. Reduce el periodo para consultar con más detalle.</p>}
  </>;
}

export function ExercisePerformance({ exercises, range, requestKey }) {
  const [selected, setSelected] = useState("");
  const [retry, setRetry] = useState(0);
  const exercise = exercises.find(({ id }) => id === selected) ?? exercises[0];
  const result = useHistoryRequest(exercise ? `${requestKey}-${exercise.id}-${retry}` : null,
    (signal) => progressApi.exercise(exercise.id, range, signal));
  return <section className="progress-panel">
    <h2 id="vista-previa-progreso">Evolución por ejercicio</h2>
    {!exercise ? <p className="progress-empty">Los ejercicios aparecerán cuando completes series en este periodo.</p> : <>
      <label>Ejercicio <select value={exercise.id} onChange={(event) => setSelected(event.target.value)}>
        {exercises.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
      </select></label>
      <RequestState result={result} retry={() => setRetry(retry + 1)}>
        {(rows) => <ExerciseDetails key={exercise.id} rows={rows} exercise={exercise} />}
      </RequestState>
    </>}
  </section>;
}
