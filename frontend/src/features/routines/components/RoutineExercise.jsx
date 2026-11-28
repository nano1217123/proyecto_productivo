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
  return <li className="routine-card routine-panel">
    <ExerciseHeading item={item} position={index + 1} />
    <details open={index === 0 ? true : undefined}>
      <summary>Configurar · {modes[plan.tipo].label}</summary>
      <div className="routine-fields">
        <label>Tipo de ejercicio<select value={plan.tipo} onChange={(event) => configure(key, "tipo", event.target.value)}>
          {Object.entries(modes).map(([value, mode]) => <option key={value} value={value}>{mode.label}</option>)}
        </select></label>
        {plan.tipo === "movilidad" && <label>Medir por<select value={timed ? "time" : "reps"}
          onChange={(event) => configure(key, "timed", event.target.value === "time")}>
          <option value="reps">Repeticiones</option><option value="time">Duración</option>
        </select></label>}
        {fieldsFor(plan.tipo, timed).map((field) => {
          const { label, min, max, step = 1 } = planFields[field];
          const value = plan[field] ?? "";
          const input = <label>{plan.tipo === "carga_adicional" && field === "pesoKg" ? "Carga adicional objetivo (kg)" : label}
            <input type="number" min={field === "repeticionesMax" ? plan.repeticiones ?? min : min} max={max} step={step}
              required={field === "series" || field === "duracionSeg" || field === "repeticiones"}
              value={value} onChange={(event) => configure(key, field, event.target.value)} />
          </label>;
          if (!["series", "descanso"].includes(field)) return <div key={field}>{input}</div>;
          return <div className="routine-stepper" key={field}>
            <button type="button" aria-label={`Reducir ${label.toLowerCase()}`} disabled={(value || min) <= min}
              onClick={() => configure(key, field, Math.max(min, Number(value) - (field === "descanso" ? 15 : 1)))}>−</button>
            {input}
            <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={value >= max}
              onClick={() => configure(key, field, Math.min(max, Number(value || (field === "descanso" ? 60 : min)) + (field === "descanso" ? 15 : 1)))}>+</button>
          </div>;
        })}
        <label>Notas del ejercicio<textarea maxLength={200} value={plan.notas ?? ""} onChange={(event) => configure(key, "notas", event.target.value)} /></label>
      </div>
    </details>
    <div className="routine-actions">
      <button type="button" disabled={index === 0} aria-label={`Subir ${item.nombre}`} onClick={() => move(index, -1)}>↑ Subir</button>
      <button type="button" disabled={index === count - 1} aria-label={`Bajar ${item.nombre}`} onClick={() => move(index, 1)}>↓ Bajar</button>
      <button type="button" onClick={() => replace(item)}>Sustituir</button>
      <button type="button" className="routine-danger" onClick={() => remove(key)}>Quitar</button>
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
