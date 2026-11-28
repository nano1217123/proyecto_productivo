import Link from "next/link";
import { useState } from "react";
import { trainingApi } from "../api/trainingApi";
import { duration, formatTime, measureLabel, normalize } from "../hooks/trainingSessionModel";

const PAGE_SIZE = 10;

function HistoryEntry({ session, gym, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = session.nombre || "Entrenamiento";
  const sets = session.series_entrenamiento;
  const durationSeconds = duration(session);
  const volume = sets.reduce((total, item) => total +
    ((!item.tipo || item.tipo === "fuerza") && item.peso_kg != null ? item.peso_kg * item.repeticiones : 0), 0);
  const groups = [...new Set(sets.map((item) => item.grupo).filter(Boolean))];

  async function change(task) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
      setEditing(false);
      await onRefresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <article className="training-card">
    <header>
      <p className="training-muted"><time dateTime={session.fecha}>{session.fecha}</time></p>
      <h3>{name}</h3>
    </header>
    <p>{new Set(sets.map((item) => item.ejercicio_id)).size} ejercicios · {sets.length} series
      {durationSeconds !== null && ` · ${formatTime(durationSeconds)}`}
      {volume > 0 && ` · ${volume.toLocaleString("es-CO")} kg × reps`}</p>
    {!!groups.length && <p className="training-muted">{groups.join(" · ")}</p>}
    <details><summary>Ver detalles</summary>
      {session.notas && <p>{session.notas}</p>}
      <ol className="grid gap-1">
        {sets.map((item) => <li key={item.id}>{item.ejercicios?.nombre} · Serie {item.numero_serie} · {measureLabel(item)}</li>)}
      </ol>
    </details>
    {editing && <form className="grid gap-2" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void change(() => trainingApi.correctTrainingSession(session.id, data.get("nombre"), data.get("notas")));
    }}>
      <label>Nombre<input name="nombre" defaultValue={name} required maxLength={100} /></label>
      <label>Notas<textarea name="notas" defaultValue={session.notas ?? ""} maxLength={200} /></label>
      <div className="training-actions">
        <button type="submit" className="training-primary" disabled={busy}>Guardar corrección</button>
        <button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancelar</button>
      </div>
    </form>}
    <div className="training-actions">
      <Link href={`/dashboard/entrenamientos?gym=${encodeURIComponent(gym)}&repetir=${encodeURIComponent(session.id)}`}>Repetir</Link>
      {!editing && <button type="button" disabled={busy} onClick={() => setEditing(true)}>Corregir nombre y notas</button>}
      <button type="button" disabled={busy} onClick={() => {
        if (window.confirm(`¿Eliminar «${name}» y todas sus series?`)) {
          void change(() => trainingApi.deleteTrainingSession(session.id));
        }
      }}>Eliminar</button>
    </div>
    {error && <p className="training-error" role="alert">{error}</p>}
  </article>;
}

export default function TrainingHistoryList({ sessions, gym, onRefresh }) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const matches = sessions.filter((item) => (!from || item.fecha >= from) && (!to || item.fecha <= to)
    && normalize([item.nombre, item.notas, ...item.series_entrenamiento.map((set) => set.ejercicios?.nombre)]
      .filter(Boolean).join(" ")).includes(normalize(query.trim())));
  return <>
    <div className="training-card">
      <label>Buscar sesiones<input type="search" value={query} onChange={(event) => {
        setQuery(event.target.value); setLimit(PAGE_SIZE);
      }} /></label>
      <div className="training-filters">
        <label>Desde<input type="date" value={from} max={to || undefined} onChange={(event) => {
          setFrom(event.target.value); setLimit(PAGE_SIZE);
        }} /></label>
        <label>Hasta<input type="date" value={to} min={from || undefined} onChange={(event) => {
          setTo(event.target.value); setLimit(PAGE_SIZE);
        }} /></label>
      </div>
      {!matches.length && <p>No hay sesiones que coincidan con los filtros.</p>}
    </div>
    {matches.slice(0, limit).map((session) => <HistoryEntry key={session.id} session={session} gym={gym} onRefresh={onRefresh} />)}
    {matches.length > limit && <button type="button" onClick={() => setLimit((value) => value + PAGE_SIZE)}>Mostrar más</button>}
  </>;
}
