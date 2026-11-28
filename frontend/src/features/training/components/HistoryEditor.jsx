import { useEffect, useState } from "react";
import { exercisesApi } from "@/src/features/exercises/api/exercisesApi";
import { fields, modes, newExercise, changeMeasure } from "../hooks/trainingSessionModel";
import { fromKilograms, toKilograms } from "../hooks/trainingUnits";
import { fieldLabel } from "./HistoryDetail";

export default function HistoryEditor({ detail, today, registerChanges, onSave, pending }) {
  const [content, setContent] = useState(detail.sesion);
  const [date, setDate] = useState(detail.fecha);
  const [unit, setUnit] = useState("kg");
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const dirty = date !== detail.fecha || content !== detail.sesion;

  useEffect(() => {
    let current = true;
    exercisesApi.getExerciseCatalog().then((groups) => {
      if (current) setCatalog(groups.flatMap((group) => group.ejercicios));
    }).catch((error) => { if (current) setCatalogError(error.message); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    registerChanges(dirty);
    if (!dirty) return;
    function warn(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    const currentUrl = window.location.href;
    const currentState = window.history.state;
    function confirmNavigation(event) {
      if (window.location.href === currentUrl || window.confirm("¿Descartar los cambios sin guardar?")) return;
      event.stopImmediatePropagation();
      window.history.pushState(currentState, "", currentUrl);
    }
    window.addEventListener("beforeunload", warn);
    window.addEventListener("popstate", confirmNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("popstate", confirmNavigation, true);
      registerChanges(false);
    };
  }, [dirty, registerChanges]);

  function updateExercise(index, update) {
    setContent((current) => ({
      ...current,
      ejercicios: current.ejercicios.flatMap((item, i) => i === index ? update(item) ?? [] : item),
    }));
  }

  function changeSet(index, seriesIndex, field, value) {
    updateExercise(index, (item) => ({
      ...item, series: item.series.map((set, i) => i === seriesIndex ? {
        ...changeMeasure(set, item.tipo, field, value), completada: true,
      } : set),
    }));
  }

  return <form className="history-stack" onSubmit={(event) => {
    event.preventDefault();
    onSave({ revision: detail.revision, fecha: date, contenido: content });
  }}>
    <h2>Editar registro</h2>
    <fieldset disabled={pending} className="history-stack">
      <div className="history-form-grid">
        <label>Nombre<input maxLength={100} required value={content.nombre} onChange={(e) => setContent({ ...content, nombre: e.target.value })} /></label>
        <label>Unidad para editar cargas<select value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="kg">Kilogramos (kg)</option><option value="lb">Libras (lb)</option>
        </select></label>
        <label>Fecha<input type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <label>Notas del entrenamiento<textarea maxLength={200} value={content.notas} onChange={(e) => setContent({ ...content, notas: e.target.value })} /></label>
      {content.ejercicios.map((item, index) => {
        const name = detail.catalogo[item.ejercicio_id]?.nombre || catalog.find((j) => j.id === item.ejercicio_id)?.nombre;
        return <section className="history-panel" key={index}>
          <div className="history-between"><h3>{name || `Ejercicio ${item.ejercicio_id}`}</h3>
            <button type="button" onClick={() => updateExercise(index, () => null)}>Quitar ejercicio</button>
          </div>
          <div className="history-form-grid">
            <label>Ejercicio<select value={item.ejercicio_id} onChange={(e) => {
              const id = Number(e.target.value);
              updateExercise(index, (previous) => ({ ...previous, ejercicio_id: id }));
            }}>
              {!catalog.some((j) => j.id === item.ejercicio_id) && <option value={item.ejercicio_id}>{name || item.ejercicio_id}</option>}
              {catalog.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select></label>
            <label>Tipo de registro<select value={item.tipo} onChange={(e) => {
              const tipo = e.target.value;
              updateExercise(index, (previous) => ({
                ...previous, tipo, objetivo: undefined, series: previous.series.map((set) =>
                  Object.fromEntries(Object.entries(set).filter(([field]) => field === "completada" || modes[tipo].fields.includes(field)))),
              }));
            }}>
              {Object.entries(modes).map(([key, mode]) => <option value={key} key={key}>{mode.label}</option>)}
            </select></label>
            <label>Notas del ejercicio<textarea value={item.notas} maxLength={200}
              onChange={(e) => updateExercise(index, (previous) => ({ ...previous, notas: e.target.value }))} /></label>
          </div>
          {item.series.map((set, i) => <fieldset className="history-set-editor" key={i}>
            <legend>Serie {i + 1}</legend>
            <div className="history-form-grid">
              {modes[item.tipo].fields.map((field) => {
                const mass = field === "peso_kg" || field === "asistencia_kg";
                return <label key={field}>{mass ? fieldLabel(field, item.tipo).replace("(kg)", `(${unit})`) : fieldLabel(field, item.tipo)}
                  <input type="number" min={fields[field].step === 1 ? 1 : 0}
                    max={mass ? fromKilograms(fields[field].max, unit) : fields[field].max} step={fields[field].step}
                    required={item.tipo !== "movilidad" && field !== "distancia_km"}
                    value={mass ? fromKilograms(set[field], unit) : set[field] ?? ""}
                    onChange={(e) => changeSet(index, i, field, mass ? toKilograms(e.target.value, unit) ?? "" : e.target.value)} />
                </label>;
              })}
            </div>
            <button type="button" disabled={item.series.length < 2} onClick={() => updateExercise(index, (previous) => ({
              ...previous, series: previous.series.filter((_, position) => position !== i),
            }))}>Quitar serie {i + 1}</button>
          </fieldset>)}
          <button type="button" disabled={item.series.length >= 30} onClick={() => updateExercise(index, (previous) => ({
            ...previous, series: [...previous.series, { completada: true }],
          }))}>Añadir serie</button>
        </section>;
      })}
      {catalogError && <p role="alert">{catalogError}</p>}
      <div className="history-actions">
        <label>Ejercicio de catálogo<select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
          <option value="">Selecciona un ejercicio</option>
          {catalog.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select></label>
        <button type="button" disabled={!exerciseId || content.ejercicios.length >= 30} onClick={() => {
          const item = newExercise(exerciseId, catalog.find((j) => j.id === Number(exerciseId)));
          setContent({ ...content, ejercicios: [...content.ejercicios, { ...item, series: [{ completada: true }] }] });
          setExerciseId("");
        }}>Añadir ejercicio</button>
      </div>
      <button className="history-primary" type="submit" aria-busy={pending}>{pending ? "Guardando…" : "Guardar corrección"}</button>
    </fieldset>
  </form>;
}
