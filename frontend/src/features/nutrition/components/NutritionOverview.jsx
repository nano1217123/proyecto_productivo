import { useState } from "react";
import { EntryList } from "./History";
import { goals, grams, meals } from "./labels";
import FoodImage from "./FoodImage";

export function GoalSummary({ profile, configure }) {
  const goal = goals[profile.settings.goal];
  return <section className="nut-panel nut-goal-summary">
    <div>
      <h2>Tu objetivo actual</h2>
      <div className="nut-goal-content">
        <span className="nut-goal-icon" aria-hidden="true">{goal.icon}</span>
        <div><strong>{goal.name}</strong><p>{goal.description}</p>
          <small>Actualizado el {(profile.reference?.day ?? profile.settings.updatedAt).slice(0, 10)}</small>
        </div>
      </div>
    </div>
    <button type="button" className="nut-icon" aria-label="Cambiar objetivo" onClick={configure}>✎</button>
  </section>;
}

export function DailyProtein({ reference, methodSource, data, tracking, explore }) {
  const amount = data?.days[0]?.protein ?? null;
  const percentage = reference && amount !== null ? Math.round(amount * 100 / reference.minimum) : null;
  const comparison = reference && amount !== null && (
    amount < reference.minimum ? `${grams(reference.minimum - amount)} hasta el extremo inferior` :
    amount > reference.maximum ? `${grams(amount - reference.maximum)} por encima del extremo superior` :
    "Dentro del intervalo orientativo"
  );
  return <section className="nut-panel nut-protein">
    <div className="nut-protein-row">
      <div>
        <h2>Proteína de hoy</h2>
        <div className="nut-protein-amount">{amount === null ? "Sin registros" : grams(amount)}
          {reference && <small> / {reference.minimum}–{grams(reference.maximum)}</small>}
        </div>
        <p>{comparison || (reference ? "Referencia diaria orientativa" : "Orientación general")}</p>
      </div>
      <div className="nut-ring" style={{ "--nut-progress": `${Math.min(100, percentage ?? 0)}%` }}>
        <span role="img" aria-label={percentage === null ? "Progreso sin información" : `${percentage} % del extremo inferior`}>{percentage === null ? "—" : `${percentage}%`}</span>
      </div>
    </div>
    {tracking ? <button className="nut-primary nut-register" onClick={() => explore()}>Registrar alimento</button> : <p>Registro de alimentos desactivado.</p>}
    <details className="nut-reference"><summary>Sobre la referencia diaria</summary>
      <p>La proteína es una parte de la alimentación. Los cambios de peso dependen también de la energía total y otros factores.</p>
      {!reference && <p>Si eres menor de edad, tienes una condición que afecta tus necesidades o necesitas orientación individual, consulta a un profesional de nutrición.</p>}
      <a href={methodSource} target="_blank" rel="noreferrer">Metodología de la referencia</a>
    </details>
  </section>;
}

export function Recommendations({ result, favorites, explore, toggle, details, log }) {
  const [expanded, setExpanded] = useState(false);
  const foods = result.data ?? [];
  return <section className="nut-overview-section">
    <div className="nut-section-heading"><h2>Recomendados para ti</h2>
      {foods.length > 3 ? <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Ver menos" : "Ver todos"}</button>
        : <button onClick={() => explore()}>Ver catálogo</button>}
    </div>
    {result.loading && <p role="status">Cargando recomendaciones…</p>}
    {foods.length ? <div className="nut-recommendations">{(expanded ? foods : foods.slice(0, 3)).map((food) => {
      const favorite = favorites.includes(food.id);
      return <article className="nut-panel nut-recommendation" key={food.id}>
        <div className="nut-recommendation-image">
          <FoodImage id={food.id} />
          <button type="button" className="nut-icon" aria-pressed={favorite}
            aria-label={`${favorite ? "Quitar" : "Guardar"} ${food.name} ${favorite ? "de" : "en"} favoritos`}
            onClick={() => toggle(food, !favorite)}>{favorite ? "★" : "☆"}</button>
        </div>
        <h3><button onClick={() => details(food)}>{food.name}</button></h3>
        <p><strong>{grams(food.protein * food.portion / 100)}</strong> de proteína</p>
        <small>Porción de {grams(food.portion)}</small>
        {log && <button className="nut-food-log" onClick={() => log(food)}>+ Registrar</button>}
      </article>;
    })}</div> : result.data && <p>Explora el catálogo para consultar alimentos y porciones.</p>}
  </section>;
}

const mealIcons = { Desayuno: "☀", "Media mañana": "◒", Almuerzo: "◇", Merienda: "☕", Cena: "☾", Otro: "○" };

export function TodayMeals({ data, tracking, explore, history, edit, remove, details }) {
  const periods = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
  const rows = data?.meals ?? [];
  for (const meal of meals) {
    if (!periods.includes(meal) && rows.some((row) => row.meal === meal)) {
      periods.splice(meal === "Media mañana" ? 1 : periods.length, 0, meal);
    }
  }
  if (rows.some((row) => row.meal === null)) periods.push(null);
  return <section className="nut-overview-section">
    <div className="nut-section-heading"><h2>Mis comidas de hoy</h2><button onClick={history}>Ver historial</button></div>
    <ul className="nut-meal-rows">
      {periods.map((meal) => {
        const label = meal ?? "Sin momento";
        const amount = rows.find((row) => row.meal === meal)?.protein;
        return <li key={label}>
          <span aria-hidden="true">{mealIcons[meal] ?? "○"}</span><strong>{label}</strong>
          <small>{amount == null ? (data ? "Sin registros" : "—") : grams(amount)}</small>
          {tracking && <button className="nut-icon" aria-label={`Registrar alimento en ${label.toLowerCase()}`} onClick={() => explore(meal)}>+</button>}
        </li>;
      })}
    </ul>
    {data && (data.entries.length ? <details className="nut-today-details">
      <summary>Ver registros de hoy</summary>
      <EntryList entries={data.entries} {...{ edit, remove, details }} />
      {data.total > data.pageSize && <button onClick={history}>Ver todos los registros</button>}
    </details> : <p>Hoy todavía no hay registros.</p>)}
  </section>;
}

const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" });

export function WeeklyProtein({ result, today }) {
  const days = result.data?.days ?? [];
  const max = Math.max(1, ...days.map(({ protein }) => protein ?? 0));
  return <section className="nut-panel nut-week">
    <div className="nut-section-heading"><h2>Registro semanal de proteína</h2><small>7 días</small></div>
    {result.loading && !days.length && <p role="status">Cargando registro semanal…</p>}
    {days.length > 0 && <>
      <ul className="nut-week-bars">
        {days.map(({ day, protein }) => {
          const label = weekday.format(new Date(`${day}T00:00:00Z`));
          const description = `${label} ${day} · ${protein === null ? "Sin registros" : grams(protein)}`;
          return <li key={day} title={description}>
            <span className="nut-chart-label">{description}</span>
            <div className="nut-week-track" aria-hidden="true" data-today={day === today}>
              {protein !== null && <span style={{ height: `${protein / max * 100}%` }} />}
            </div>
            <small aria-hidden="true">{label}</small>
          </li>;
        })}
      </ul>
      <p>Los días sin registros se muestran como días sin información.</p>
    </>}
  </section>;
}
