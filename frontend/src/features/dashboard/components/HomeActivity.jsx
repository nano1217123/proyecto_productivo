import Link from "next/link";
import { dayLabel, minutes } from "@/src/features/training/hooks/historyDates";
import { civilWeekday, weekDays } from "../homeModel";
import { HomeIcon, HomePanel, SectionState } from "./HomePanel";

export function HomeWeek({ today, offset, setOffset, history, routines, retry, url }) {
  const days = weekDays(today, offset);
  const period = offset ? "Semana anterior" : "Esta semana";
  const planned = new Set(routines.data?.flatMap(({ dias }) => dias));
  const date = (day) => dayLabel(day, { day: "numeric", month: "short" });

  return <>
    <HomePanel title="Tu semana" className="home-week" action={
      <button className="home-link" type="button" onClick={() => setOffset(offset ? 0 : -1)}>
        {offset ? "Semana actual" : "Semana anterior"}
      </button>}>
      <p className="home-small">{date(days[0])} – {date(days[6])}</p>
      <SectionState result={history} retry={retry}>{({ dias }) => <ul className="home-calendar" aria-label={period}>
        {days.map((day) => {
          const count = dias.find(({ fecha }) => fecha === day)?.sesiones ?? 0;
          const scheduled = !offset && planned.has(civilWeekday(day));
          const description = [dayLabel(day, { dateStyle: "full" }), day === today && "Hoy",
            count ? `${count} sesiones` : "Sin sesiones", scheduled && "Rutina planificada"].filter(Boolean).join(", ");
          return <li key={day}>
            <span aria-hidden="true">{dayLabel(day, { weekday: "short" }).replace(".", "")}</span>
            {count ? <Link aria-label={description} aria-current={day === today ? "date" : undefined}
              className={`home-day done ${scheduled ? "planned" : ""}`} href={url("/entrenamientos/historial", { dia: day })}>
              {Number(day.slice(8))}<strong>{count}</strong>
            </Link> : <span className={`home-day ${scheduled ? "planned" : ""}`} aria-current={day === today ? "date" : undefined}>
              <span aria-hidden="true">{Number(day.slice(8))}</span><span className="sr-only">{description}</span>
            </span>}
          </li>;
        })}
      </ul>}</SectionState>
      <div className="home-legend"><span>● Sesiones registradas</span>{!offset && routines.data && <span>◌ Planificación actual</span>}</div>
    </HomePanel>
    {history.data && <WeekMetrics rows={history.data.dias.filter(({ fecha }) => days.includes(fecha))} period={period} />}
  </>;
}

function WeekMetrics({ rows, period }) {
  const timeRows = rows.filter(({ tiempo }) => tiempo != null);
  const metrics = [
    ["training", rows.reduce((sum, row) => sum + row.sesiones, 0), "Sesiones"],
    ["time", timeRows.length ? minutes(timeRows.reduce((sum, row) => sum + row.tiempo, 0)) : "—", "Tiempo registrado"],
    ["routine", rows.reduce((sum, row) => sum + row.series, 0), "Series completadas"],
  ];
  return <section className="home-metrics" aria-label={`Indicadores de entrenamiento · ${period}`}>
    {metrics.map(([icon, value, label]) => <div key={label}>
      <HomeIcon name={icon} /><strong>{value}</strong><span>{label}</span><small>{period}</small>
    </div>)}
  </section>;
}

export function HomeModules({ routines, history, profile, url, retry }) {
  const modules = [
    ["routine", "Mis rutinas", routines.data ? `${routines.data.length} rutinas activas` : "Gestiona tu planificación", url("/rutinas")],
    ["history", "Historial", history.data ? `${history.data.total} sesiones registradas` : "Consulta tus entrenamientos", url("/entrenamientos/historial")],
    ["training", "Catálogo de ejercicios", "Explora por grupo muscular", url("/ejercicios")],
    ["house", "Entrena en casa", "Ejercicios sin equipo de gimnasio", url("/ejercicios", { modo: "casa" })],
  ];
  if (profile.tipo_usuario === "cliente" && profile.sede) {
    modules.push(["routine", "Reseñas de mi sede", "Consulta y comparte experiencias", url("/resenas")]);
  }
  return <section className="home-modules" aria-labelledby="home-modules-title">
    <h2 id="home-modules-title">Tu actividad</h2>
    <div className="home-module-grid">{modules.map(([icon, name, description, href]) => <Link key={name} href={href} className="home-module">
      <div><HomeIcon name={icon} /><HomeIcon name="arrow" /></div>
      <strong>{name}</strong><small>{description}</small>
    </Link>)}</div>
    {routines.error && <SectionState result={routines} retry={retry} />}
  </section>;
}
