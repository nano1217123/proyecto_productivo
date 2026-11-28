import Link from "next/link";
import { duration, fields, modes } from "../hooks/trainingSessionModel";
import { civilToday, fullDate, minutes, number, timeLabel } from "../hooks/historyDates";

export const fieldLabel = (field, type) => field === "peso_kg" && type === "carga_adicional" ? "Carga adicional (kg)" : fields[field].label;

export default function HistoryDetail({ detail, query, onRepeat, onEdit, pending }) {
  const { sesion, catalogo, mejoras } = detail;
  const muscles = new Map();
  for (const item of sesion.ejercicios) {
    const group = catalogo[item.ejercicio_id]?.grupo;
    if (group) muscles.set(group, (muscles.get(group) ?? 0) + item.series.length);
  }
  const sets = sesion.ejercicios.reduce((sum, item) => sum + item.series.length, 0);
  const volumes = (detail.volumenPorEjercicio ?? []).filter((value) => value != null);
  return <div className="history-stack">
    <header className="history-detail-heading">
      <span className="history-tags"><span>Finalizado</span></span>
      <h2>{sesion.nombre}</h2>
      <p className="history-muted">{fullDate(detail.fecha)}</p>
      {detail.iniciadoEn && <p>Inicio · {fullDate(civilToday(new Date(detail.iniciadoEn)))} · {timeLabel(detail.iniciadoEn)}</p>}
      {detail.finalizadoEn && <p>Fin · {fullDate(civilToday(new Date(detail.finalizadoEn)))} · {timeLabel(detail.finalizadoEn)}</p>}
      {detail.rutina && <Link href={`/dashboard/rutinas/${detail.rutina.id}?${query}`}>{detail.rutina.nombre}</Link>}
      {sesion.notas && <p>{sesion.notas}</p>}
    </header>
    <dl className="history-summary">
      <div><dt>Duración</dt><dd>{minutes(duration(detail))}</dd></div>
      <div><dt>Ejercicios</dt><dd>{sesion.ejercicios.length}</dd></div>
      <div><dt>Series</dt><dd>{sets}</dd></div>
      {volumes.length > 0 && <div><dt>Volumen registrado</dt><dd>{number(volumes.reduce((a, b) => a + b, 0))} kg</dd></div>}
    </dl>
    {!!mejoras.length && <section className="history-panel history-record">
      <h3>🏆 Récords personales</h3>
      <ul>{mejoras.map((mark) => <li key={`${mark.ejercicio_id}-${mark.tipo}`}>
        {catalogo[mark.ejercicio_id]?.nombre} · {number(mark.anterior)} → {number(mark.peso)} kg
        {mark.tipo === "carga_adicional" && " de carga adicional"}
      </li>)}</ul>
    </section>}
    <h3>Ejercicios realizados</h3>
    {!sesion.ejercicios.length && <p>No hay series disponibles para esta sesión.</p>}
    {sesion.ejercicios.map((item, index) => {
      const meta = catalogo[item.ejercicio_id];
      const columns = modes[item.tipo].fields.filter((field) => item.series.some((set) => set[field] != null));
      const exerciseVolume = detail.volumenPorEjercicio?.[index];
      return <article key={index} className="history-panel">
        <div className="history-exercise-title">
          {meta?.imagen && <img src={meta.imagen} alt="" width="56" height="56" loading="lazy" />}
          <div><h4>{index + 1}. {meta?.nombre || `Ejercicio ${item.ejercicio_id}`}</h4>
            <p className="history-muted">{[meta?.musculo || meta?.grupo, meta?.equipo, modes[item.tipo].label].filter(Boolean).join(" · ")}</p></div>
        </div>
        <div className="history-scroll"><table>
          <thead><tr><th scope="col">Serie</th>{columns.map((field) => <th scope="col" key={field}>{fieldLabel(field, item.tipo)}</th>)}<th scope="col">Estado</th></tr></thead>
          <tbody>{item.series.map((set, i) => <tr key={i}><th scope="row">{i + 1}</th>
            {columns.map((field) => <td key={field}>{number(set[field])}</td>)}<td>Completada</td></tr>)}</tbody>
        </table></div>
        {item.descanso > 0 && <p>Descanso · {item.descanso} s</p>}
        {item.notas && <p>{item.notas}</p>}
        {exerciseVolume != null && <p>Volumen registrado · {number(exerciseVolume)} kg</p>}
      </article>;
    })}
    {!!muscles.size && <section className="history-panel">
      <h3>Grupos musculares trabajados</h3>
      {[...muscles.entries()].sort((a, b) => b[1] - a[1]).map(([group, count]) => <div key={group} className="history-muscle">
        <label><span>{group}</span><span>{count} series</span><progress max={sets} value={count} /></label>
      </div>)}
      <p className="history-muted">Series completadas por grupo principal.</p>
    </section>}
    <div className="history-actions">
      <button className="history-primary" disabled={pending} onClick={() => onRepeat(detail.id)}>↻ Repetir entrenamiento</button>
      <Link href={`/dashboard/rutinas/nueva?${query}&entrenamiento=${detail.id}`}>Guardar como rutina</Link>
      <button onClick={() => onEdit(detail.id)}>Editar registro</button>
    </div>
  </div>;
}
