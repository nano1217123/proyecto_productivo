import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNutritionData } from "../hooks/useNutritionData";
import { grams, meals } from "./labels";

function shift(day, amount) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function EntryList({ entries, edit, remove, details }) {
  return <ul className="nut-list">{entries.map((entry) => <li key={entry.id}>
    <div><strong>{entry.snapshot.name}</strong><small>{entry.day.slice(0, 10)} · {entry.meal ?? "Sin momento"} · {grams(entry.grams)} de alimento</small></div>
    <strong>{grams(entry.protein)}</strong>
    <div className="nut-actions"><button onClick={() => details(entry.snapshot)}>Detalles</button>
      <button onClick={() => edit(entry)}>Editar</button><button onClick={() => remove(entry)}>Eliminar</button></div>
  </li>)}</ul>;
}

export function Distribution({ values }) {
  return values.length > 0 && <ul className="nut-distribution">
    {values.map(({ meal, protein }) => <li key={meal ?? "none"}><span>{meal ?? "Sin momento"}</span><strong>{grams(protein)}</strong></li>)}
  </ul>;
}

export default function History({ today, version, edit, remove, details, retry }) {
  const [day, setDay] = useState(today);
  const [days, setDays] = useState(7);
  const [meal, setMeal] = useState("");
  const [foodId, setFoodId] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const catalog = useNutritionData("alimentos", { q: search }, version);
  const result = useNutritionData("registros", { day, days, meal, foodId, page }, version);
  const data = result.data;
  const changeDay = (value) => { if (value && value <= today) { setDay(value); setPage(1); } };
  return <section className="nut-stack">
    <h2>Historial nutricional</h2>
    <div className="nut-panel nut-fields">
      <label>Fecha final<input type="date" value={day} max={today} onChange={(e) => changeDay(e.target.value)} /></label>
      <label>Periodo<select value={days} onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }}>
        <option value={1}>Día</option><option value={7}>Últimos siete días</option><option value={30}>Últimos treinta días</option>
      </select></label>
      <label>Momento<select value={meal} onChange={(e) => { setMeal(e.target.value); setPage(1); }}>
        <option value="">Todos</option>{meals.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label>Filtrar por alimento<input value={search} onChange={(e) => { setSearch(e.target.value); setFoodId(""); setPage(1); }} maxLength={100} />
        <select aria-label="Alimento" value={foodId} onChange={(e) => { setFoodId(e.target.value); setPage(1); }}>
          <option value="">Todos</option>{catalog.data?.items.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}
        </select></label>
      <div className="nut-actions"><button onClick={() => changeDay(shift(day, -1))}>Día anterior</button>
        <button disabled={day >= today} onClick={() => changeDay(shift(day, 1))}>Día siguiente</button></div>
    </div>
    {result.loading && <p role="status">Cargando historial…</p>}
    {result.error && <p role="alert">{result.error} <button onClick={retry}>Reintentar</button></p>}
    {data && <>
      <article className="nut-panel">
        <h3>Proteína registrada</h3>
        {data.daysRecorded ? <>
          <p>{data.daysRecorded} de {days} días con registros · Promedio de {grams(data.average)} por día registrado</p>
          <div className="nut-chart" aria-hidden="true"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.days}><XAxis dataKey="day" tickFormatter={(value) => value.slice(5)} /><YAxis width={32} />
              <Tooltip formatter={(value) => grams(value)} /><Bar name="Proteína registrada" dataKey="protein" fill="#b56cff" />
            </BarChart>
          </ResponsiveContainer></div>
        </> : <p>Sin registros para este periodo y filtros.</p>}
        <details><summary>Ver datos por día y referencia vigente en cada fecha</summary>
          <ul>{data.days.map((item) => <li key={item.day}>{item.day} · {item.protein === null ? "Sin información" : grams(item.protein)}
            {item.reference && ` · Referencia ${item.reference.minimum}–${grams(item.reference.maximum)}`}</li>)}</ul>
        </details>
      </article>
      {data.daysRecorded > 0 && <div className="nut-fields">
        <article className="nut-panel"><h3>Distribución por comidas</h3><Distribution values={data.meals} /></article>
        <article className="nut-panel"><h3>Alimentos más frecuentes</h3><ul>{data.frequent.map((food) => <li key={food.foodId}>{food.name} · {food.count}</li>)}</ul></article>
      </div>}
      {data.references.length > 0 && <details className="nut-panel"><summary>Cambios de objetivo y referencia en el periodo</summary>
        <ul>{data.references.map((reference) => <li key={reference.id}>{reference.day.slice(0, 10)} · {reference.goal} · {reference.minimum == null ? "Orientación general" : `${reference.minimum}–${grams(reference.maximum)}`}</li>)}</ul>
      </details>}
      <EntryList {...{ entries: data.entries, edit, remove, details }} />
      {data.total > data.pageSize && <div className="nut-actions">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page}</span>
        <button disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>}
    </>}
  </section>;
}
