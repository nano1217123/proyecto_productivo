import { civilDate, fullDate, monthLabel, monthRange } from "../hooks/historyDates";

export default function HistoryCalendar({ month, setMonth, today, selected, onDate, days }) {
  const { desde, hasta } = monthRange(month);
  const offset = (civilDate(desde).getUTCDay() + 6) % 7;
  const counts = new Map(days.map((day) => [day.fecha, day.sesiones]));
  return <section className="history-panel" aria-label="Calendario de entrenamiento">
    <div className="history-between">
      <h2 className="history-month">{monthLabel(desde)}</h2>
      <div className="history-actions">
        <label><span className="history-visually-hidden">Elegir mes y año</span>
          <input type="month" value={desde.slice(0, 7)} onChange={(event) => {
            if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(`${event.target.value}-01`);
          }} />
        </label>
        <button type="button" aria-label="Mes anterior" onClick={() => setMonth(monthRange(month, -1).desde)}>‹</button>
        <button type="button" onClick={() => setMonth(today)}>Hoy</button>
        <button type="button" aria-label="Mes siguiente" onClick={() => setMonth(monthRange(month, 1).desde)}>›</button>
      </div>
    </div>
    <p className="history-muted">{days.length} días con entrenamientos registrados</p>
    <div className="history-calendar">
      {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={`espacio-${i}`} />)}
      {Array.from({ length: Number(hasta.slice(-2)) }, (_, i) => {
        const day = `${desde.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
        const count = counts.get(day) ?? 0;
        return <button type="button" key={day} aria-current={today === day ? "date" : undefined}
          aria-pressed={selected === day} aria-label={`${fullDate(day)}, ${count} sesiones registradas`}
          onClick={() => onDate(day)}>{i + 1}{count > 0 && <small>{count}</small>}</button>;
      })}
    </div>
  </section>;
}
