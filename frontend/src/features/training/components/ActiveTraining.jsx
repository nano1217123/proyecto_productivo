import { Fragment, useEffect, useMemo, useState } from "react";
import TrainingCatalogDialog from "./TrainingCatalogDialog";
import TrainingExerciseCard from "./TrainingExerciseCard";
import { useRestTimer } from "../hooks/useRestTimer";
import { formatTime, historyReference, newExercise, sessionStats } from "../hooks/trainingSessionModel";

function ElapsedTime({ start }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(start)) / 1000));
  const formatted = formatTime(elapsed);
  return <strong>{elapsed < 3600 ? `00:${formatted}` : formatted.padStart(8, "0")}</strong>;
}

function RestStrip({ rest }) {
  return <aside className="training-rest-strip" aria-label="Temporizador de descanso">
    <span aria-hidden="true">◷</span>
    <div><small role="status">{rest.remaining ? "Tiempo de descanso" : "Descanso terminado"}</small>
      <strong>{formatTime(rest.remaining)}</strong></div>
    <button type="button" onClick={() => rest.adjust(15)}>+15 s</button>
    <button type="button" onClick={rest.skip}>Omitir</button>
    <details className="training-menu">
      <summary className="training-icon-button" aria-label="Opciones del temporizador">⋮</summary>
      <div className="training-menu-panel">
        <button type="button" onClick={rest.toggle} disabled={!rest.remaining}>{rest.timer.deadline ? "Pausar" : "Reanudar"}</button>
        <button type="button" onClick={() => rest.adjust(-15)}>−15 s</button>
        <button type="button" onClick={rest.reset}>Reiniciar</button>
      </div>
    </details>
  </aside>;
}

export default function ActiveTraining({ draft, edit, close, catalog, catalogError, retryCatalog, history, status, onBack }) {
  const [picker, setPicker] = useState(null);
  const [expanded, setExpanded] = useState(0);
  const rest = useRestTimer();
  const { contenido } = draft;
  const stats = sessionStats(contenido);
  const metadata = useMemo(() => new Map(catalog.flatMap((group) =>
    group.ejercicios.map((exercise) => [exercise.id, exercise]))), [catalog]);
  const references = useMemo(() => {
    const result = new Map();
    for (const item of contenido.ejercicios) {
      const key = `${item.ejercicio_id}:${item.tipo}`;
      if (!result.has(key)) result.set(key, historyReference(history, item.ejercicio_id, item.tipo));
    }
    return result;
  }, [contenido.ejercicios, history]);

  function updateExercises(transform) {
    edit((previous) => {
      const ejercicios = transform(previous.ejercicios);
      return ejercicios.length <= 30 && ejercicios.reduce((sum, item) => sum + item.series.length, 0) <= 200
        ? { ...previous, ejercicios } : previous;
    });
  }

  function finalize() {
    if (!stats.done) return;
    if (stats.done !== stats.total && !window.confirm("Quedan series pendientes. ¿Finalizar guardando únicamente las completadas?")) return;
    close("finalizar");
  }

  return (
    <section className="training-session" aria-label="Entrenamiento en curso">
      <header className="training-session-header">
        <button type="button" className="training-icon-button" onClick={onBack} aria-label="Volver al panel">←</button>
        <div className="training-session-title">
          <p className="training-pill">Entrenamiento en curso</p>
          <h1>{contenido.nombre || "Entrenamiento libre"}</h1>
        </div>
        <details className="training-menu">
          <summary className="training-icon-button" aria-label="Opciones del entrenamiento">⋮</summary>
          <fieldset className="training-menu-panel" disabled={Boolean(draft.action)}>
            <details><summary>Nombre y notas</summary>
              <label>Nombre<input value={contenido.nombre} maxLength={100}
                onChange={(event) => edit((previous) => ({ ...previous, nombre: event.target.value }))} /></label>
              <label>Notas generales<textarea value={contenido.notas} maxLength={200}
                onChange={(event) => edit((previous) => ({ ...previous, notas: event.target.value }))} /></label>
            </details>
            <label className="training-toggle"><input type="checkbox" checked={rest.automatic}
              onChange={(event) => rest.setAutomatic(event.target.checked)} /> Descanso automático</label>
            <button type="button" onClick={() => rest.start(60)}>Iniciar descanso</button>
            <button type="button" onClick={() => {
              if (window.confirm("¿Cancelar esta sesión? Las series de esta sesión se descartarán.")) close("cancelar");
            }}>Cancelar sesión</button>
          </fieldset>
        </details>
      </header>
      <div className="training-session-metrics">
        <div><span aria-hidden="true">◷</span><ElapsedTime start={draft.iniciadoEn} /><small>Duración</small></div>
        <div><span aria-hidden="true">▤</span><strong>{stats.done} / {stats.total}</strong><small>Series</small></div>
        <div><span aria-hidden="true">◇</span><strong>{stats.volume ? `${stats.volume.toLocaleString("es-CO")} kg` : "—"}</strong><small title="Kilogramos por repeticiones">Volumen</small></div>
      </div>
      <progress max={stats.total || 1} value={stats.done} aria-label="Series completadas" />
      <fieldset className="training-work" disabled={Boolean(draft.action)}>
        <div className="training-actions training-section-heading">
          <h2>Ejercicios de hoy</h2>
          <button type="button" className="training-subtle" disabled={!catalog.length || stats.exercises >= 30 || stats.total >= 200}
            onClick={() => setPicker({ index: null })}>+ Añadir ejercicios</button>
        </div>
        {catalogError && <p role="alert">{catalogError} <button type="button" onClick={retryCatalog}>Reintentar catálogo</button></p>}
        {!contenido.ejercicios.length && <p className="training-muted">Añade un ejercicio para registrar tu primera serie.</p>}
        {contenido.ejercicios.map((item, index) => (
          <Fragment key={index}>
            <TrainingExerciseCard item={item} metadata={metadata.get(item.ejercicio_id)}
              reference={references.get(`${item.ejercicio_id}:${item.tipo}`)} index={index} count={stats.exercises}
              expanded={expanded === index} onToggle={() => setExpanded(expanded === index ? null : index)}
              onChange={(next) => updateExercises((list) => list.map((value, i) => i === index ? next : value))}
              onMove={(direction) => {
                updateExercises((list) => {
                  const next = [...list];
                  [next[index], next[index + direction]] = [next[index + direction], next[index]];
                  return next;
                });
                setExpanded(index + direction);
              }}
              onReplace={() => setPicker({ index })}
              onRemove={() => {
                if (!item.series.some((set) => set.completada) || window.confirm("¿Quitar el ejercicio y sus series realizadas?")) {
                  updateExercises((list) => list.filter((_, i) => i !== index));
                  setExpanded(Math.max(0, Math.min(index, stats.exercises - 2)));
                }
              }}
              onStartRest={rest.start}
              onComplete={(seconds) => { if (rest.automatic) rest.start(seconds); }} />
            {rest.timer && (expanded ?? 0) === index && <RestStrip rest={rest} />}
          </Fragment>
        ))}
        {rest.timer && !stats.exercises && <RestStrip rest={rest} />}
        <div className="training-finish">
          <p className="training-sync" role="status">{status === "Sincronizado" ? "Cambios guardados" : status}</p>
          <button type="button" className="training-primary" onClick={finalize} disabled={!stats.done}>Finalizar entrenamiento</button>
        </div>
      </fieldset>
      {picker && <TrainingCatalogDialog catalog={catalog} single={picker.index !== null} onClose={() => setPicker(null)}
        onSelect={(selected) => {
          const replacements = selected.map((exercise) => newExercise(exercise.id, exercise));
          if (picker.index !== null) {
            if (contenido.ejercicios[picker.index].series.some((set) => set.completada) &&
              !window.confirm("¿Reemplazar el ejercicio y descartar sus series realizadas?")) return;
            updateExercises((list) => list.map((item, i) => i === picker.index ? replacements[0] : item));
          } else {
            if (!stats.exercises) setExpanded(0);
            updateExercises((list) => [...list, ...replacements.slice(0, Math.min(30 - list.length, 200 - stats.total))]);
          }
        }} />}
    </section>
  );
}
