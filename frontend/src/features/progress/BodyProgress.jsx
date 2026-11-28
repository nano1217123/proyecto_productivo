import { useEffect, useRef, useState } from "react";
import { civilToday, dayLabel, number, timeLabel } from "@/src/features/training/hooks/historyDates";
import { HomeIcon } from "@/src/features/dashboard/components/HomePanel";
import { ProgressChart } from "./ProgressChart";
import { progressApi } from "./progressApi";

export const weightLabel = (value) => value == null ? "Sin registro" : `${number(value)} kg`;
const dateLabel = (day) => dayLabel(day, { dateStyle: "long" });
export const weightDate = (instant) => dateLabel(civilToday(new Date(instant)));

export function WeightOverview({ data }) {
  const points = (data.puntos ?? []).map((row) => ({
    time: Date.parse(row.fecha), value: row.pesoActualKg,
    detail: `${weightDate(row.fecha)} · ${timeLabel(row.fecha)}`,
  }));
  return <section className="progress-panel">
    <h2>Evolución del peso corporal</h2>
    <p className="progress-muted">Promedio del periodo · {weightLabel(data.promedio)}</p>
    <ProgressChart points={points} label="Peso corporal" unit="kg" weight />
    {data.total > points.length && <p className="progress-muted">La gráfica muestra los {points.length.toLocaleString("es-CO")} registros más recientes del periodo. El historial incluye todos.</p>}
  </section>;
}

export function WeightHistory({ data, page, sort, onPage, onSort, onAction }) {
  return <section className="progress-panel">
    <div className="progress-section-head">
      <h2>Historial de peso</h2>
      <label>Orden <select value={sort} onChange={(event) => onSort(event.target.value)}>
        <option value="desc">Más recientes</option><option value="asc">Más antiguos</option>
      </select></label>
    </div>
    {!data.registros.length && <p className="progress-empty">No hay registros de peso en este periodo.</p>}
    <ul className="progress-list">
      {data.registros.map((row) => <li key={row.id}>
        <div className="progress-row-info"><HomeIcon name="scale" /><div>
          <strong>{weightLabel(row.pesoActualKg)}</strong>
          <small>{weightDate(row.fecha)} · {timeLabel(row.fecha)}</small>
          {row.pesoActualizadoEn && <small>Modificado el {weightDate(row.pesoActualizadoEn)}</small>}
        </div></div>
        <div className="progress-actions">
          <button type="button" onClick={() => onAction({ kind: "edit", row })}>Editar<span className="sr-only"> peso del {weightDate(row.fecha)}</span></button>
          <button type="button" onClick={() => onAction({ kind: "delete", row })}>Eliminar<span className="sr-only"> peso del {weightDate(row.fecha)}</span></button>
        </div>
      </li>)}
    </ul>
    {data.total > 15 && <div className="progress-actions progress-pagination">
      <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>Anterior</button>
      <span>Página {page} de {Math.ceil(data.total / 15)}</span>
      <button type="button" disabled={page * 15 >= data.total} onClick={() => onPage(page + 1)}>Siguiente</button>
    </div>}
  </section>;
}

export function BodyDialog({ dialog, close, saved }) {
  const ref = useRef(null);
  const lock = useRef(false);
  const requestId = useRef(null);
  const { kind, row, height } = dialog;
  const heightForm = kind === "height";
  const remove = kind === "delete";
  const title = { add: "Registrar peso", edit: "Editar registro de peso", delete: "Eliminar registro de peso", height: "Altura del perfil" }[kind];
  const [value, setValue] = useState(heightForm ? height ?? "" : row?.pesoActualKg ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialogElement = ref.current;
    const trigger = document.activeElement;
    dialogElement.showModal();
    return () => {
      dialogElement.close();
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    const input = String(value).trim();
    const numeric = Number(input.replace(",", "."));
    if (!remove && (!/^\d+(?:[.,]\d+)?$/.test(input) || (heightForm
      ? !Number.isInteger(numeric) || numeric < 1 || numeric > 300
      : numeric < 20 || numeric > 300))) {
      setError(heightForm ? "Ingresa la altura en centímetros enteros." : "Ingresa un peso válido entre 20 y 300 kg.");
      return;
    }
    lock.current = true;
    setPending(true);
    setError("");
    try {
      if (heightForm) await progressApi.saveHeight(numeric);
      else if (remove) await progressApi.deleteWeight(row.id);
      else if (kind === "edit") await progressApi.editWeight(row.id, numeric);
      else {
        requestId.current ??= crypto.randomUUID();
        await progressApi.addWeight(requestId.current, numeric);
      }
      saved(kind);
    } catch (failure) {
      if ([400, 409, 415].includes(failure.status)) requestId.current = null;
      setError(failure.status ? failure.message : "No se pudo confirmar el cambio. Puedes volver a intentarlo.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return <dialog ref={ref} aria-labelledby="progress-dialog-title" className="progress-dialog" onCancel={(event) => {
    event.preventDefault();
    if (!lock.current) close();
  }}>
    <form onSubmit={submit}>
      <h2 id="progress-dialog-title">{title}</h2>
      {remove ? <p>¿Quieres eliminar el registro de {weightLabel(row.pesoActualKg)} del {weightDate(row.fecha)}?</p>
        : <>
          <label>{heightForm ? "Altura (cm)" : "Peso corporal (kg)"}
            <input autoFocus required inputMode={heightForm ? "numeric" : "decimal"} value={value}
              onChange={(event) => setValue(event.target.value)} disabled={pending || !!requestId.current} />
          </label>
          {!heightForm && <p className="progress-muted">{row ? weightDate(row.fecha) : dateLabel(civilToday())} · hora de Bogotá</p>}
        </>}
      {error && <p role="alert">{error}</p>}
      <div className="progress-actions">
        <button type="button" onClick={close} disabled={pending} autoFocus={remove}>Cancelar</button>
        <button type="submit" className="progress-primary" disabled={pending}>{pending ? "Guardando…" : remove ? "Eliminar registro" : "Guardar registro"}</button>
      </div>
    </form>
  </dialog>;
}
