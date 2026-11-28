import { useId } from "react";
import { fields, measureLabel, modes, changeMeasure, validSet } from "../hooks/trainingSessionModel";

export default function TrainingExerciseCard({
  item, metadata, reference, index, count, expanded, onToggle, onChange, onMove, onReplace, onRemove, onComplete, onStartRest,
}) {
  const bodyId = useId();
  const done = item.series.filter((set) => set.completada).length;
  const mode = modes[item.tipo];
  const nombre = metadata?.nombre || `Ejercicio ${item.ejercicio_id}`;
  const setSeries = (series) => onChange({ ...item, series });

  function updateSet(position, next) {
    setSeries(item.series.map((set, i) => i === position ? next : set));
  }

  return (
    <article className="training-exercise" data-expanded={expanded}>
      <div className="training-exercise-heading">
        <button type="button" className="training-exercise-toggle" onClick={onToggle}
          aria-expanded={expanded} aria-controls={bodyId}>
          {metadata?.imagen_url
            ? <img width="52" height="52" loading="lazy" alt="" src={metadata.imagen_url} />
            : <span className="training-exercise-placeholder" aria-hidden="true">▧</span>}
          <span className="training-exercise-title">
            <strong>{nombre}</strong>
            {expanded && <small>{[metadata?.musculo_principal || metadata?.grupo_nombre, metadata?.equipo].filter(Boolean).join(" · ")}</small>}
            {expanded
              ? <span className="training-pill">{done} de {item.series.length} series</span>
              : <small>{done === item.series.length && item.series.length ? "Series completadas" : `${item.series.length - done} series pendientes`}</small>}
          </span>
          {!expanded && <span aria-hidden="true">⌄</span>}
        </button>
      </div>
      <div id={bodyId} className="training-exercise-body" hidden={!expanded}>
        {item.objetivo && measureLabel(item.objetivo) !== "—" && <p className="training-muted">Objetivo · {measureLabel(item.objetivo)}</p>}
        <details className="training-menu training-exercise-menu">
          <summary className="training-icon-button" aria-label={`Opciones de ${nombre}`}>⋮</summary>
          <div className="training-menu-panel">
            <p className="training-muted">{mode.label} · {item.descanso} s de descanso</p>
            {reference?.last && <p className="training-muted">Última sesión · {reference.last.date}</p>}
            {reference?.best != null && <p className="training-muted">Mejor carga · {reference.best} kg</p>}
            {metadata && (metadata.descripcion || metadata.consejo || metadata.video_url) && (
              <details><summary>Cómo hacer el ejercicio</summary>
                {metadata.descripcion && <p>{metadata.descripcion}</p>}
                {metadata.consejo && <p>{metadata.consejo}</p>}
                {metadata.video_url && <a href={metadata.video_url} target="_blank" rel="noreferrer">Ver demostración</a>}
              </details>
            )}
            <div className="training-filters">
              <label>Tipo de registro<select value={item.tipo} onChange={(event) => {
                if (item.series.some((set) => Object.keys(set).some((key) => key !== "completada" && set[key] != null)) &&
                  !window.confirm("Cambiar el tipo reiniciará las medidas de este ejercicio. ¿Continuar?")) return;
                onChange({ ...item, objetivo: undefined, tipo: event.target.value, series: item.series.map(() => ({ completada: false })) });
              }}>{Object.entries(modes).map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}</select></label>
              <label>Descanso (s)<input type="number" min="0" max="3600" value={item.descanso}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 0 && value <= 3600) onChange({ ...item, descanso: value });
                }} /></label>
            </div>
            {item.tipo === "fuerza" && metadata?.equipo?.toLowerCase().includes("mancuerna") &&
              <p className="training-muted">Si usas dos mancuernas a la vez, registra la suma de ambas.</p>}
            <div className="training-actions">
              <button type="button" disabled={!item.descanso} onClick={() => onStartRest(item.descanso)}>Iniciar descanso de {item.descanso} s</button>
              <button type="button" disabled={!index} onClick={() => onMove(-1)}>Subir</button>
              <button type="button" disabled={index === count - 1} onClick={() => onMove(1)}>Bajar</button>
              <button type="button" onClick={onReplace}>Sustituir</button>
              <button type="button" onClick={onRemove}>Quitar ejercicio</button>
            </div>
          </div>
        </details>
        <div className="training-sets" data-fields={mode.fields.length}>
          <div className="training-set training-set-head" aria-hidden="true">
            <span>Serie</span><span>Anterior</span>
            {mode.fields.map((field) => <span key={field}>{field === "peso_kg" ? "Kg" : fields[field].label}</span>)}
            <span>Estado</span>
          </div>
          {item.series.map((set, i) => (
            <div key={i} className="training-set" data-done={set.completada}>
              <span>{i + 1}</span><small>{measureLabel(reference?.last?.series[i])}</small>
              {mode.fields.map((field) => (
                <label key={field}><input type="number" min={fields[field].step === 1 ? 1 : 0}
                  max={fields[field].max} step={fields[field].step} value={set[field] ?? ""}
                  inputMode={fields[field].step === 1 ? "numeric" : "decimal"}
                  aria-label={`${fields[field].label}, serie ${i + 1} de ${nombre}`}
                  onChange={(event) => updateSet(i, changeMeasure(set, item.tipo, field, event.target.value))} /></label>
              ))}
              <button type="button" className="training-check" aria-pressed={set.completada}
                aria-label={`${set.completada ? "Desmarcar" : "Completar"} serie ${i + 1} de ${nombre}`}
                disabled={!set.completada && !validSet(item.tipo, set)} onClick={() => {
                  updateSet(i, { ...set, completada: !set.completada });
                  if (!set.completada) onComplete(item.descanso);
                }}>{set.completada ? "✓" : "●"}</button>
              <button type="button" className="training-remove-set" aria-label={`Quitar serie ${i + 1} de ${nombre}`}
                onClick={() => setSeries(item.series.filter((_, pos) => pos !== i))}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="training-add-set" disabled={item.series.length >= 30} onClick={() => setSeries([
          ...item.series, { ...item.series.at(-1), completada: false },
        ])}>+ Añadir serie</button>
        <details className="training-exercise-note">
          <summary>{item.notas ? "Editar nota" : "▤ Añadir nota"}</summary>
          <label>Notas del ejercicio<input value={item.notas} maxLength={200}
            onChange={(event) => onChange({ ...item, notas: event.target.value })} /></label>
        </details>
      </div>
    </article>
  );
}
