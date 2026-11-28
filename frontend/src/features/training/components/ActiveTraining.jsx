import { useEffect, useState } from "react";
import TrainingCatalogDialog from "./TrainingCatalogDialog";
import TrainingExerciseCard from "./TrainingExerciseCard";
import { useRestTimer } from "../hooks/useRestTimer";
import { formatTime, historyReference, newExercise, sessionStats } from "../hooks/trainingSessionModel";

export default function ActiveTraining({ draft, edit, close, catalog, catalogError, retryCatalog, history }) {
  const [picker, setPicker] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const rest = useRestTimer();
  const { contenido } = draft;
  const stats = sessionStats(contenido);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(draft.iniciadoEn)) / 1000));
  const metadata = new Map(catalog.flatMap((group) => group.ejercicios.map((exercise) => [exercise.id, exercise])));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    <>
      <section className="training-card training-active-header">
        <p className="training-eyebrow">Entrenamiento en curso</p>
        <h1>{contenido.nombre || "Entrenamiento libre"}</h1>
        <div className="training-metrics">
          <div><strong>{formatTime(elapsed)}</strong><small>Tiempo</small></div>
          <div><strong>{stats.exercises}</strong><small>Ejercicios</small></div>
          <div><strong>{stats.done}/{stats.total}</strong><small>Series</small></div>
          {stats.volume > 0 && <div><strong>{stats.volume.toLocaleString("es-CO")}</strong><small>Volumen (kg × reps)</small></div>}
        </div>
        <progress max={stats.total || 1} value={stats.done} aria-label="Series completadas" />
        <details><summary>Nombre y notas</summary>
          <label>Nombre<input value={contenido.nombre} maxLength={100} disabled={Boolean(draft.action)}
            onChange={(event) => edit((previous) => ({ ...previous, nombre: event.target.value }))} /></label>
          <label>Notas generales<textarea value={contenido.notas} maxLength={200} disabled={Boolean(draft.action)}
            onChange={(event) => edit((previous) => ({ ...previous, notas: event.target.value }))} /></label>
        </details>
      </section>
      {rest.timer && <aside className="training-card training-timer" aria-label="Temporizador de descanso">
        <div><strong>{formatTime(rest.remaining)}</strong><span role="status">{rest.remaining ? "Descanso" : "Descanso terminado"}</span></div>
        <div className="training-actions">
          <button type="button" onClick={rest.toggle} disabled={!rest.remaining}>{rest.timer.deadline ? "Pausar" : "Reanudar"}</button>
          <button type="button" onClick={() => rest.adjust(-15)}>−15 s</button>
          <button type="button" onClick={() => rest.adjust(15)}>+15 s</button>
          <button type="button" onClick={rest.reset}>Reiniciar</button>
          <button type="button" onClick={rest.skip}>Omitir</button>
        </div>
      </aside>}
      <fieldset className="training-work" disabled={Boolean(draft.action)}>
        <div className="training-actions training-section-heading">
          <h2>Ejercicios</h2>
          <button type="button" className="training-primary" disabled={!catalog.length || stats.exercises >= 30 || stats.total >= 200}
            onClick={() => setPicker({ index: null })}>+ Añadir ejercicios</button>
        </div>
        {catalogError && <p role="alert">{catalogError} <button type="button" onClick={retryCatalog}>Reintentar catálogo</button></p>}
        {!contenido.ejercicios.length && <p className="training-muted">Añade un ejercicio para registrar tu primera serie.</p>}
        {contenido.ejercicios.map((item, index) => (
          <TrainingExerciseCard key={index} item={item} metadata={metadata.get(item.ejercicio_id)}
            reference={historyReference(history, item.ejercicio_id, item.tipo)} index={index} count={stats.exercises}
            onChange={(next) => updateExercises((list) => list.map((value, i) => i === index ? next : value))}
            onMove={(direction) => updateExercises((list) => {
              const next = [...list];
              [next[index], next[index + direction]] = [next[index + direction], next[index]];
              return next;
            })}
            onReplace={() => setPicker({ index })}
            onRemove={() => {
              if (!item.series.some((set) => set.completada) || window.confirm("¿Quitar el ejercicio y sus series realizadas?")) {
                updateExercises((list) => list.filter((_, i) => i !== index));
              }
            }}
            onComplete={(seconds) => { if (rest.automatic) rest.start(seconds); }} />
        ))}
        <div className="training-actions">
          <label className="training-toggle"><input type="checkbox" checked={rest.automatic}
            onChange={(event) => rest.setAutomatic(event.target.checked)} /> Descanso automático</label>
          <button type="button" onClick={() => rest.start(60)}>Iniciar descanso</button>
        </div>
        <div className="training-actions training-finish">
          <button type="button" className="training-primary" onClick={finalize} disabled={!stats.done}>Finalizar entrenamiento</button>
          <button type="button" onClick={() => {
            if (window.confirm("¿Cancelar esta sesión? Las series de esta sesión se descartarán.")) close("cancelar");
          }}>Cancelar sesión</button>
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
            updateExercises((list) => [...list, ...replacements.slice(0, Math.min(30 - list.length, 200 - stats.total))]);
          }
        }} />}
    </>
  );
}
