import { useState } from "react";
import { useNutritionData } from "../hooks/useNutritionData";
import FoodImage from "./FoodImage";
import { grams } from "./labels";

export function FoodCard({ food, favorite, toggle, details, log }) {
  return <article className="nut-panel nut-food">
    <FoodImage id={food.id} />
    <small>{food.category} · {food.state}</small>
    <h3>{food.name}</h3>
    <strong>{grams(food.protein * food.portion / 100)} de proteína</strong>
    <p>Porción de {grams(food.portion)} · {grams(food.protein)} de proteína por 100 g</p>
    {food.reason && <p>{food.reason}</p>}
    <div className="nut-actions">
      <button onClick={() => details(food)}>Detalles</button>
      {log && <button className="nut-primary" onClick={() => log(food)}>Registrar</button>}
      <button aria-pressed={favorite} onClick={() => toggle(food, !favorite)}>{favorite ? "★ Guardado" : "☆ Guardar"}</button>
    </div>
  </article>;
}

export default function FoodCatalog({ version, toggle, details, log, retry, meal }) {
  const [filters, setFilters] = useState({ q: "", category: "", origin: "", sort: "nombre", favorite: "", compatible: "" });
  const [page, setPage] = useState(1);
  const result = useNutritionData("alimentos", { ...filters, page }, version);
  function filter(event) {
    const field = event.target;
    setFilters((previous) => ({ ...previous, [field.name]: field.type === "checkbox" ? (field.checked ? "true" : "") : field.value }));
    setPage(1);
  }
  return <section className="nut-stack">
    <h2>Explorar alimentos</h2>
    {meal && <p>Elige un alimento para {meal.toLowerCase()}.</p>}
    <div className="nut-panel nut-fields">
      <label>Buscar por nombre<input name="q" value={filters.q} maxLength={100} onChange={filter} /></label>
      <label>Categoría<select name="category" onChange={filter} value={filters.category}>
        <option value="">Todas</option>
        {["Animal", "Lácteos", "Legumbres", "Cereales y tubérculos", "Frutas", "Verduras", "Frutos secos y grasas"].map((category) => <option key={category}>{category}</option>)}
      </select></label>
      <label>Origen<select name="origin" onChange={filter}><option value="">Todos</option><option value="animal">Animal</option><option value="vegetal">Vegetal</option></select></label>
      <label>Orden<select name="sort" onChange={filter}><option value="nombre">Nombre</option><option value="proteina">Proteína por 100 g</option></select></label>
      <label><input name="favorite" type="checkbox" onChange={filter} /> Solo favoritos</label>
      <label><input name="compatible" type="checkbox" onChange={filter} /> Filtrar por mis preferencias</label>
    </div>
    {result.loading && <p role="status">Cargando alimentos…</p>}
    {result.error && <p role="alert">{result.error} <button onClick={retry}>Reintentar</button></p>}
    {result.data && <>
      {result.data.items.length ? <div className="nut-grid">{result.data.items.map((food) =>
        <FoodCard key={food.id} food={food} favorite={food.favorite} {...{ toggle, details, log }} />)}</div> : <p>Sin alimentos para estos filtros.</p>}
      {result.data.total > 12 && <div className="nut-actions"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page}</span><button disabled={page * 12 >= result.data.total} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
    </>}
  </section>;
}
