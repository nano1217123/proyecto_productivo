import { useEffect, useRef, useState } from "react";
import { normalize } from "../hooks/trainingSessionModel";

export default function TrainingCatalogDialog({ catalog, onSelect, onClose, single }) {
  const dialog = useRef(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [selected, setSelected] = useState([]);
  useEffect(() => { dialog.current.showModal(); }, []);
  const all = catalog.flatMap((item) => item.ejercicios);
  const results = all.filter((item) => normalize(item.nombre).includes(normalize(query)) &&
    (!group || item.grupo_slug === group) && (!equipment || item.equipo === equipment));

  return (
    <dialog ref={dialog} className="training-dialog" onClose={onClose} aria-labelledby="catalog-title">
      <div className="training-dialog-heading">
        <h2 id="catalog-title">{single ? "Sustituir ejercicio" : "Añadir ejercicios"}</h2>
        <button type="button" onClick={() => dialog.current.close()}>Cerrar</button>
      </div>
      <label>Buscar por nombre<input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="training-filters">
        <label>Grupo muscular<select value={group} onChange={(event) => setGroup(event.target.value)}>
          <option value="">Todos</option>
          {catalog.map((item) => <option key={item.slug} value={item.slug}>{item.nombre}</option>)}
        </select></label>
        <label>Equipamiento<select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
          <option value="">Todos</option>
          {[...new Set(all.map((item) => item.equipo).filter(Boolean))].sort().map((item) => <option key={item}>{item}</option>)}
        </select></label>
      </div>
      <div className="training-catalog-results">
        {!results.length && <p>No hay ejercicios que coincidan.</p>}
        {results.map((item) => (
          <div key={item.id} className="training-catalog-item">
            <label><input type={single ? "radio" : "checkbox"} name="catalog-selection"
              checked={selected.includes(item.id)} onChange={() => setSelected((previous) => single
                ? [item.id] : previous.includes(item.id) ? previous.filter((id) => id !== item.id) : [...previous, item.id])} />
              <span><strong>{item.nombre}</strong><small>{[item.grupo_nombre, item.equipo].filter(Boolean).join(" · ")}</small></span>
            </label>
            {item.descripcion && <details><summary>Instrucciones</summary><p>{item.descripcion}</p></details>}
          </div>
        ))}
      </div>
      <button type="button" className="training-primary" disabled={!selected.length} onClick={() => {
        onSelect(selected.map((id) => all.find((item) => item.id === id)));
        dialog.current.close();
      }}>{single ? "Sustituir" : `Añadir (${selected.length})`}</button>
    </dialog>
  );
}
