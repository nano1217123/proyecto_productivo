import { modes } from "@/src/features/training/hooks/trainingSessionModel";
import { exerciseType, fieldsFor, planFields } from "../routineModel";

export function ExerciseMedia({ item }) {
  return item.imagen_url ? <img className="routine-media" src={item.imagen_url} alt="" loading="lazy" /> : null;
}

export function ExerciseHeading({ item, position }) {
  return <div className="routine-entry">
    <ExerciseMedia item={item} />
    <div><strong>{position}. {item.nombre}</strong>
      <p className="routine-muted">{[item.grupo_nombre, item.equipo].filter(Boolean).join(" · ")}</p>
      {item.video_url && <a href={item.video_url} target="_blank" rel="noreferrer">Ver demostración</a>}
    </div>
  </div>;
}

export function RoutineExerciseEditor({ item, index, count, configure, move, replace, remove }) {
  const { key, plan, timed } = item;
  const fields = fieldsFor(plan.tipo, timed);
  const optional = ["pesoKg", "asistenciaKg", "distanciaKm"];

  function control(field) {
    const { label, min, max, step = 1 } = planFields[field];
    return <label key={field}>{plan.tipo === "carga_adicional" && field === "pesoKg" ? "Carga adicional objetivo (kg)" : label}
      <input type="number" min={field === "repeticionesMax" ? plan.repeticiones ?? min : min} max={max} step={step}
        required={["series", "duracionSeg", "repeticiones"].includes(field)}
        value={plan[field] ?? ""} onChange={(event) => configure(key, field, event.target.value)} />
    </label>;
  }

  return <li className="routine-card routine-exercise-editor">
    <div className="routine-exercise-top">
      <ExerciseHeading item={item} position={index + 1} />
      <button type="button" className="routine-danger" aria-label={`Quitar ${item.nombre}`} onClick={() => remove(key)}>Quitar</button>
    </div>
    <div className="routine-exercise-fields">
      {fields.filter((field) => !optional.includes(field)).map(control)}
    </div>
    <details className="routine-extra">
      <summary>{fields.includes("pesoKg") ? "Peso objetivo y notas" : "Configuración y notas"}</summary>
      <div className="routine-fields">
        <label>Tipo de ejercicio<select value={plan.tipo} onChange={(event) => configure(key, "tipo", event.target.value)}>
          {Object.entries(modes).map(([value, mode]) => <option key={value} value={value}>{mode.label}</option>)}
        </select></label>
        {plan.tipo === "movilidad" && <label>Medir por<select value={timed ? "time" : "reps"}
          onChange={(event) => configure(key, "timed", event.target.value === "time")}>
          <option value="reps">Repeticiones</option><option value="time">Duración</option>
        </select></label>}
        {fields.filter((field) => optional.includes(field)).map(control)}
        <label>Notas del ejercicio<textarea maxLength={200} value={plan.notas ?? ""} onChange={(event) => configure(key, "notas", event.target.value)} /></label>
      </div>
    </details>
    <div className="routine-actions routine-exercise-actions">
      <button type="button" disabled={index === 0} aria-label={`Subir ${item.nombre}`} onClick={() => move(index, -1)}>↑ Subir</button>
      <button type="button" disabled={index === count - 1} aria-label={`Bajar ${item.nombre}`} onClick={() => move(index, 1)}>↓ Bajar</button>
      <button type="button" onClick={() => replace(item)}>Sustituir</button>
    </div>
  </li>;
}

export function RoutineExerciseDetail({ item, position }) {
  const plan = item.plan || {};
  const type = exerciseType(item);
  const entries = fieldsFor(type, plan.duracionSeg != null)
    .filter((field) => !["repeticionesMax"].includes(field) && (plan[field] != null || ["series", "descanso"].includes(field)));
  return <li className="routine-card routine-panel">
    <ExerciseHeading item={item} position={position} />
    <p className="routine-muted">{modes[type].label}</p>
    <dl className="routine-measures">{entries.map((field) => <div key={field}>
      <dt>{planFields[field].label}</dt>
      <dd>{field === "repeticiones" && plan.repeticionesMax != null
        ? `${plan.repeticiones}–${plan.repeticionesMax}` : plan[field] ?? (field === "series" ? 1 : 60)}</dd>
    </div>)}</dl>
    {plan.notas && <p>{plan.notas}</p>}
  </li>;
}
