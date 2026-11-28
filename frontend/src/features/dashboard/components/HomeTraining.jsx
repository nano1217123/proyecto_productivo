import { useState } from "react";
import Link from "next/link";
import { routineStats } from "@/src/features/routines/routineModel";
import { routinesApi } from "@/src/features/routines/api/routinesApi";
import { useHistoryRequest } from "@/src/features/training/hooks/useHistoryRequest";
import { formatTime, sessionStats } from "@/src/features/training/hooks/trainingSessionModel";
import { civilWeekday, trainingState } from "../homeModel";
import { HomeIcon, SectionState } from "./HomePanel";

function Actions({ href, label, secondary, secondaryLabel }) {
  return <div className="home-actions">
    <Link className="home-button" href={href}>{label}</Link>
    {secondary && <Link className="home-link" href={secondary}>{secondaryLabel}</Link>}
  </div>;
}

function ScheduledTraining({ options, url }) {
  const [selected, select] = useState("");
  const [revision, retry] = useState(0);
  const routine = options.find(({ id }) => id === selected) || options[0];
  const details = useHistoryRequest(`${routine.id}:${revision}`, (signal) => routinesApi.getRoutineDetail(routine.id, signal));
  return <>
    <h2>{routine.nombre}</h2>
    {options.length > 1 && <label className="home-select">Rutina de hoy
      <select value={routine.id} onChange={(event) => select(event.target.value)}>
        {options.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
      </select>
    </label>}
    <SectionState result={details} retry={() => retry(revision + 1)}>{(detail) => {
      const { groups, series, minutes } = routineStats(detail.ejercicios);
      const image = detail.ejercicios.find((exercise) => exercise.imagen_url)?.imagen_url;
      return <div className="home-routine-preview">
        <div><p>{groups.join(" · ")}</p>
          <p>{detail.ejercicios.length} ejercicios · {series} series{minutes != null && ` · ≈ ${minutes} min`}</p></div>
        {image && <img src={image}
          alt="" width="100" height="68" loading="lazy" decoding="async" />}
      </div>;
    }}</SectionState>
    <Actions href={url("/entrenamientos", { rutina: routine.id })} label="Iniciar entrenamiento"
      secondary={url(`/rutinas/${routine.id}`)} secondaryLabel="Consultar rutina" />
  </>;
}

export default function HomeTraining({ active, history, routines, today, now, url }) {
  const checking = !active.draft && (!active.ready && !active.error ||
    (!history.data && !history.error) || (!routines.data && !routines.error));
  const state = checking ? "loading" : trainingState({ active: active.draft, history: history.data, routines: routines.data, today });
  const free = url("/entrenamientos", { libre: "1" });
  const resume = url("/entrenamientos", { continuar: "1" });
  const last = history.data?.ultimo;
  const session = active.draft;
  const stats = session && sessionStats(session.contenido);
  const elapsed = session?.iniciadoEn && Math.max(0, Math.floor((+now - Date.parse(session.iniciadoEn)) / 1000));
  return <section className="home-hero" aria-label="Entrenamiento">
    <p className="home-kicker"><HomeIcon name="training" /> {{
      loading: "Entrenamiento", active: "Entrenamiento en curso", scheduled: "Tu entrenamiento de hoy",
      completed: "Entrenamiento registrado hoy", new: "Tu primer entrenamiento", free: "Entrenamiento",
    }[state]}</p>
    {checking && <SectionState result={{}} />}
    {state === "active" && <>
      <h2>{session.contenido.nombre}</h2>
      <p>{stats.exercises} ejercicios · {stats.done} de {stats.total} series completadas · {stats.total - stats.done} pendientes</p>
      {stats.total > 0 && <progress aria-label="Series completadas" value={stats.done} max={stats.total} />}
      <p>{elapsed != null && `${formatTime(elapsed)} transcurridos · `}{active.status}</p>
      <Actions href={resume} label="Reanudar entrenamiento" />
    </>}
    {state === "scheduled" && <ScheduledTraining options={routines.data.filter(({ dias }) => dias.includes(civilWeekday(today)))} url={url} />}
    {state === "completed" && <>
      <h2>{last.nombre || "Entrenamiento"} completado</h2>
      <Actions href={url("/entrenamientos/historial", { sesion: last.id })} label="Consultar entrenamiento"
        secondary={free} secondaryLabel="Iniciar otra sesión" />
    </>}
    {state === "new" && <>
      <h2>Comienza tu camino de entrenamiento</h2>
      <p>Prepara tu primera rutina o registra una sesión a tu ritmo.</p>
      <Actions href={url("/rutinas/nueva")} label="Crear mi primera rutina" secondary={free} secondaryLabel="Iniciar entrenamiento libre" />
    </>}
    {state === "free" && <>
      <h2>¿Listo para entrenar?</h2>
      <p>Elige una de tus rutinas o empieza una sesión libre.</p>
      <Actions href={free} label="Iniciar entrenamiento libre" secondary={url("/rutinas")} secondaryLabel="Elegir una rutina" />
    </>}
    {active.error && <div className="home-error" role="alert"><p>No se pudo sincronizar el entrenamiento.</p>
      <button className="home-link" type="button" onClick={active.sync}>Reintentar</button></div>}
  </section>;
}
