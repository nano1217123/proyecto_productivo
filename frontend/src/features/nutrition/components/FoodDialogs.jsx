import { useEffect, useRef, useState } from "react";
import { nutritionApi } from "../api/nutritionApi";
import { useNutritionData } from "../hooks/useNutritionData";
import FoodImage from "./FoodImage";
import { grams, meals } from "./labels";

function Dialog({ title, close, children }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className="nut-dialog" aria-label={title}
    onCancel={(event) => { event.preventDefault(); close(); }}>
    <div className="nut-actions nut-between"><h2>{title}</h2><button type="button" onClick={close}>Cerrar</button></div>
    {children}
  </dialog>;
}

export function FoodDetail({ food, close, favorite, toggle, log }) {
  const alternatives = useNutritionData("alimentos", { category: food.category, compatible: "true" }, 0);
  return <Dialog title={food.name} close={close}>
    <FoodImage id={food.id} />
    <p>{food.category} · {food.state}</p><details><summary>Descripción en la fuente</summary><p lang="en">{food.description}</p></details>
    <table><thead><tr><th>Nutriente</th><th>Por 100 g</th><th>Por porción ({grams(food.portion)})</th></tr></thead>
      <tbody>{Object.entries({ Proteína: food.protein, Carbohidratos: food.carbs, Grasas: food.fat }).map(([name, amount]) =>
        <tr key={name}><th scope="row">{name}</th><td>{grams(amount)}</td><td>{grams(amount * food.portion / 100)}</td></tr>)}</tbody>
    </table>
    <p>Alérgenos identificados · {food.allergens.join(", ") || "Sin alérgenos consignados"}. Revisa el etiquetado y la preparación si tienes alergias.</p>
    {alternatives.data?.items.some((item) => item.id !== food.id) && <p>Alternativas · {alternatives.data.items.filter((item) => item.id !== food.id).slice(0, 3).map((item) => item.name).join(", ")}</p>}
    <p><a href={food.source} target="_blank" rel="noreferrer">Fuente USDA FoodData Central</a></p>
    <div className="nut-actions"><button onClick={() => toggle(food, !favorite)} aria-pressed={favorite}>{favorite ? "Quitar favorito" : "Guardar favorito"}</button>
      {log && <button className="nut-primary" onClick={() => log(food)}>Registrar alimento</button>}</div>
  </Dialog>;
}

export function EntryForm({ food, entry, day, today, close, saved }) {
  const [requestId] = useState(() => globalThis.crypto?.randomUUID?.());
  const [quantity, setQuantity] = useState(String(entry?.quantity ?? 1));
  const [unit, setUnit] = useState(entry?.unit ?? "porción");
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const key = `${quantity}-${unit}`;
  useEffect(() => {
    if (!(Number(quantity) > 0)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      nutritionApi.quote({ foodId: food.id, quantity: Number(quantity), unit }, entry?.id, controller.signal).then(
        (data) => { if (!controller.signal.aborted) setEstimate({ key, data }); },
        (error) => { if (!controller.signal.aborted) setEstimate({ key, error: error.message }); },
      );
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [food.id, quantity, unit, key, entry?.id]);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await nutritionApi.save({ ...(!entry && requestId ? { requestId } : {}), foodId: food.id, quantity: Number(quantity), unit, day: form.get("day"), meal: form.get("meal") || null }, entry?.id);
      saved(entry ? "Registro actualizado." : "Alimento registrado.");
    } catch (error) { setError(error.message); }
    finally { setPending(false); }
  }
  return <Dialog title={entry ? "Editar registro" : "Registrar alimento"} close={close}>
    <form className="nut-stack" onSubmit={submit}>
      <h3>{food.name}</h3>
      <div className="nut-fields">
        <label>Cantidad<input value={quantity} type="number" min=".01" max="10000" step=".01" onChange={(e) => setQuantity(e.target.value)} required /></label>
        <label>Unidad<select value={unit} onChange={(e) => setUnit(e.target.value)}>{Object.entries(food.units).map(([name, weight]) =>
          <option key={name} value={name}>{name}{name !== "g" ? ` (≈ ${grams(weight)})` : ""}</option>)}</select></label>
        <label>Fecha<input type="date" name="day" defaultValue={entry?.day.slice(0, 10) ?? day} max={today} required /></label>
        <label>Momento<select name="meal" defaultValue={entry?.meal ?? ""}><option value="">Sin especificar</option>{meals.map((meal) => <option key={meal}>{meal}</option>)}</select></label>
      </div>
      <p aria-live="polite">{estimate?.key === key && (estimate.error || `${grams(estimate.data.protein)} de proteína en ${grams(estimate.data.grams)} de alimento`)}</p>
      {error && <p role="alert">{error}</p>}
      <button className="nut-primary" disabled={pending}>{pending ? "Guardando…" : "Confirmar registro"}</button>
    </form>
  </Dialog>;
}
