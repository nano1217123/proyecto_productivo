import { useState } from "react";
import { modes, normalize } from "@/src/features/training/hooks/trainingSessionModel";
import { exerciseType } from "../routineModel";
import { ExerciseMedia } from "./RoutineExercise";

const PAGE_SIZE = 6;

export default function RoutineExercisePicker({ catalogo, selected, replacing, onAdd, onRemove, onCancel }) {
  const [filters, setFilters] = useState({ search: "", group: "", equipment: "", type: "" });
  const [page, setPage] = useState(0);
  const catalog = catalogo.flatMap((group) => group.ejercicios);
  const equipment = [...new Set(catalog.map((item) => item.equipo).filter(Boolean))].sort();
  const results = catalog.filter((item) =>
    (!filters.group || item.grupo_slug === filters.group) &&
    (!filters.equipment || item.equipo === filters.equipment) &&
    (!filters.type || exerciseType(item) === filters.type) &&
    normalize(filters.search.trim()).split(/\s+/).every((word) =>
      normalize(`${item.nombre} ${item.grupo_nombre} ${item.musculo_principal || ""}`).includes(word)
    )
  );
  const start = page * PAGE_SIZE;

  function update(field, value) {
    setPage(0);
    setFilters((previous) => ({ ...previous, [field]: value }));
  }

  return <section className="routine-card routine-panel routine-stack" aria-labelledby="routine-catalog">
    <div className="routine-actions">
      <h2 id="routine-catalog">{replacing ? `Sustituir ${replacing.nombre}` : "Catálogo de ejercicios"}</h2>
      {replacing && <button type="button" onClick={onCancel}>Cancelar sustitución</button>}
    </div>
    <div className="routine-fields">
      <label>Buscar ejercicios<input type="search" value={filters.search} onChange={(event) => update("search", event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} /></label>
      <label>Grupo muscular<select value={filters.group} onChange={(event) => update("group", event.target.value)}>
        <option value="">Todos los grupos</option>
        {catalogo.map((group) => <option key={group.slug} value={group.slug}>{group.nombre}</option>)}
      </select></label>
      <label>Equipamiento<select value={filters.equipment} onChange={(event) => update("equipment", event.target.value)}>
        <option value="">Todo el equipamiento</option>
        {equipment.map((item) => <option key={item}>{item}</option>)}
      </select></label>
      <label>Tipo sugerido<select value={filters.type} onChange={(event) => update("type", event.target.value)}>
        <option value="">Todos los tipos</option>
        {Object.entries(modes).map(([value, mode]) => <option key={value} value={value}>{mode.label}</option>)}
      </select></label>
    </div>
    <p role="status" className="routine-muted">{results.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, results.length)} de ${results.length} ejercicios` : "No se encontraron ejercicios."} · {selected.length}/30 seleccionados</p>
    <ul className="routine-stack">
      {results.slice(start, start + PAGE_SIZE).map((item) => {
        const exists = selected.find((entry) => entry.ejercicio_id === item.id);
        return <li className="routine-card routine-panel" key={item.id}>
          <div className="routine-entry">
            <ExerciseMedia item={item} />
            <div><strong>{item.nombre}</strong><p className="routine-muted">{[item.grupo_nombre, item.equipo, modes[exerciseType(item)].label].filter(Boolean).join(" · ")}</p></div>
          </div>
          <div className="routine-actions">
            <button type="button" disabled={replacing ? Boolean(exists) : !exists && selected.length >= 30}
              aria-label={`${exists && !replacing ? "Quitar" : replacing ? "Sustituir por" : "Agregar"} ${item.nombre}`}
              onClick={() => exists && !replacing ? onRemove(exists.key) : onAdd(item)}>
              {exists ? (replacing ? "Ya seleccionado" : "✓ Seleccionado · Quitar") : replacing ? "Elegir sustituto" : "Agregar"}
            </button>
            {(item.descripcion || item.musculo_principal || item.video_url) && <details>
              <summary>Información</summary>
              {item.musculo_principal && <p>Músculo principal · {item.musculo_principal}</p>}
              {item.descripcion && <p>{item.descripcion}</p>}
              {item.video_url && <a href={item.video_url} target="_blank" rel="noreferrer">Ver demostración</a>}
            </details>}
          </div>
        </li>;
      })}
    </ul>
    {results.length > PAGE_SIZE && <div className="routine-actions">
      <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0}>Anterior</button>
      <button type="button" onClick={() => setPage(page + 1)} disabled={start + PAGE_SIZE >= results.length}>Siguiente</button>
    </div>}
  </section>;
}
