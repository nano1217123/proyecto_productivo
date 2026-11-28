import Link from "next/link";
import { fullDate, minutes, monthLabel, number, timeLabel } from "../hooks/historyDates";

export default function HistoryList({ rows, order, query, onDetail, onRepeat, onCompare, onEdit, onDelete, comparison, pending }) {
  const groups = [];
  for (const row of rows) {
    const key = ["antiguos", "recientes"].includes(order || "recientes") ? row.fecha.slice(0, 7) : "";
    if (groups.at(-1)?.key !== key) groups.push({ key, rows: [] });
    groups.at(-1).rows.push(row);
  }
  return groups.map(({ key, rows: sessions }) => <section className="history-stack" key={key || "resultados"}>
    {key && <h2 className="history-month">{monthLabel(sessions[0].fecha)}</h2>}
    {sessions.map((row) => <article className="history-card" key={row.id} data-reference={comparison?.id === row.id ? "" : undefined}>
      <div className="history-card-top">
        <div className="history-date" aria-hidden="true"><small>{new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" }).format(new Date(row.fecha))}</small><strong>{row.fecha.slice(-2)}</strong></div>
        <div>
          <h3>{row.nombre || "Entrenamiento"}</h3>
          <p className="history-muted">{fullDate(row.fecha)}{row.iniciadoEn && ` · ${timeLabel(row.iniciadoEn)}`}</p>
          {row.rutina && <Link href={`/dashboard/rutinas/${row.rutina.id}?${query}`}>{row.rutina.nombre}</Link>}
        </div>
        <details className="history-menu">
          <summary aria-label={`Acciones para ${row.nombre || "entrenamiento"}`}>⋯</summary>
          <div>
            <button disabled={comparison?.id === row.id} onClick={() => onCompare(row)}>{comparison ? "Comparar con esta sesión" : "Comparar entrenamiento"}</button>
            <Link href={`/dashboard/rutinas/nueva?${query}&entrenamiento=${row.id}`}>Guardar como rutina</Link>
            <button onClick={() => onEdit(row.id)}>Editar registro</button>
            <button className="history-danger" onClick={() => onDelete(row)}>Eliminar registro</button>
          </div>
        </details>
      </div>
      <dl className="history-card-metrics">
        <div><dt>Duración</dt><dd>{minutes(row.duracion)}</dd></div>
        <div><dt>Ejercicios</dt><dd>{row.ejercicios}</dd></div>
        <div><dt>Series</dt><dd>{row.series}</dd></div>
        {row.volumen != null && <div><dt>Volumen registrado</dt><dd>{number(row.volumen)} kg</dd></div>}
      </dl>
      <div className="history-tags">{row.grupos.map((group) => <span key={group}>{group}</span>)}{!!row.records && <span className="history-record">🏆 {row.records} {row.records === 1 ? "récord personal" : "récords personales"}</span>}</div>
      <div className="history-card-footer">
        <button type="button" onClick={() => onDetail(row.id)}>Ver detalles <span aria-hidden="true">→</span></button>
        <button type="button" disabled={pending} onClick={() => onRepeat(row.id)}><span aria-hidden="true">↻</span> Repetir</button>
      </div>
    </article>)}
  </section>);
}
