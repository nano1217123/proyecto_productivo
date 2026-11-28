"use client";

import { useState } from "react";
import Link from "next/link";
import { nutritionApi } from "../api/nutritionApi";
import { useNutritionData } from "../hooks/useNutritionData";
import ProfileForm from "../components/ProfileForm";
import FoodImage from "../components/FoodImage";
import FoodCatalog, { FoodCard } from "../components/FoodCatalog";
import History, { Distribution, EntryList } from "../components/History";
import { EntryForm, FoodDetail } from "../components/FoodDialogs";
import { goals, grams } from "../components/labels";
import "./nutrition.css";

const sections = { overview: "Resumen", catalog: "Alimentos", history: "Historial", meals: "Ideas de comidas" };

function DailyProtein({ reference, data, tracking, explore }) {
  const amount = data?.days[0]?.protein ?? null;
  const percentage = reference && amount !== null ? Math.round(amount * 100 / reference.minimum) : null;
  return <article className="nut-panel nut-protein nut-stack">
    <h2>Proteína de hoy</h2>
    <div className="nut-metrics">
      <div><small>Proteína registrada</small><strong>{amount === null ? "Sin registros" : grams(amount)}</strong></div>
      <div><small>Referencia orientativa</small><strong>{reference ? `${reference.minimum}–${grams(reference.maximum)}` : "Orientación general"}</strong></div>
    </div>
    {percentage !== null && <>
      <label className="nut-progress">{percentage} % del extremo inferior de la referencia
        <progress max="100" value={Math.min(100, percentage)} /></label>
      <p>{amount < reference.minimum ? `${grams(reference.minimum - amount)} hasta el extremo inferior` :
        amount > reference.maximum ? `${grams(amount - reference.maximum)} por encima del extremo superior` : "Dentro del intervalo orientativo"}</p>
    </>}
    {!reference && <p>Si eres menor de edad, tienes una condición que afecta tus necesidades o necesitas orientación individual, consulta a un profesional de nutrición.</p>}
    <p>La proteína es una parte de la alimentación. Los cambios de peso dependen también de la energía total y otros factores.</p>
    {tracking ? <button className="nut-primary" onClick={explore}>Registrar alimento</button> : <p>Registro de alimentos desactivado.</p>}
  </article>;
}

export default function NutritionPage({ gym }) {
  const [view, setView] = useState("overview");
  const [configure, setConfigure] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const profileResult = useNutritionData("perfil", {}, version);
  const profile = profileResult.data;
  const ready = Boolean(profile?.settings);
  const daily = useNutritionData(ready && !configure && view === "overview" ? "registros" : null, { day: profile?.today }, version);
  const suggested = useNutritionData(ready && view === "overview" ? "recomendaciones" : null, {}, version);
  const favorites = useNutritionData(ready || view === "catalog" ? "alimentos" : null, { favorite: "true" }, version);
  const ideas = useNutritionData(view === "meals" ? "comidas" : null, {}, version);
  const retry = () => setVersion((value) => value + 1);
  const details = (food) => setDialog({ type: "details", food });
  const log = profile?.settings?.tracking ? (food) => setDialog({ type: "entry", food }) : undefined;
  const edit = (entry) => setDialog({ type: "entry", food: entry.snapshot, entry });

  function saved(message) {
    setStatus(message);
    setError("");
    setDialog(null);
    setConfigure(false);
    retry();
  }
  async function toggle(food, enabled) {
    try {
      await nutritionApi.favorite(food.id, enabled);
      setStatus(enabled ? "Alimento guardado en favoritos." : "Alimento retirado de favoritos.");
      setError("");
      retry();
    } catch (error) { setError(error.message); }
  }
  async function remove(entry) {
    if (!window.confirm(`¿Eliminar el registro de ${entry.snapshot.name}?`)) return;
    try { await nutritionApi.remove(entry.id); saved("Registro eliminado."); }
    catch (error) { setError(error.message); }
  }

  return <main className="nut-shell nut-stack">
    <header className="nut-header">
      <div><Link href={`/dashboard${gym ? "?" + new URLSearchParams({ gym }) : ""}`}>← Panel principal</Link>
        <h1>Mi nutrición</h1><p>Explora alimentos y lleva un registro de la proteína que consumes.</p></div>
      {ready && <button onClick={() => setConfigure(!configure)}>{configure ? "Volver al resumen" : "Configuración nutricional"}</button>}
    </header>
    {(profileResult.loading || daily.loading) && <p role="status">Cargando información nutricional…</p>}
    {(error || profileResult.error || daily.error || suggested.error || favorites.error) &&
      <p role="alert" className="nut-panel">{error || profileResult.error || daily.error || suggested.error || favorites.error} <button onClick={() => { setError(""); retry(); }}>Reintentar</button></p>}
    {status && <p role="status" className="nut-status">{status}</p>}
    {profile && (configure || !ready) && <ProfileForm profile={profile} saved={saved} close={() => setConfigure(false)} />}
    {!configure && profile && <>
      <nav className="nut-tabs" aria-label="Secciones de nutrición">{Object.entries(sections).map(([key, label]) =>
        <button key={key} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}>{label}</button>)}</nav>
      {view === "overview" && ready && <>
        <div className="nut-overview">
          <DailyProtein reference={profile.reference?.currentEstimate} data={daily.data} tracking={profile.settings.tracking} explore={() => setView("catalog")} />
          <article className="nut-panel nut-goal-summary">
            <h2>Objetivo actual</h2><strong>{goals[profile.settings.goal].name}</strong>
            <p>{goals[profile.settings.goal].description}</p>
            <p>Actualizado el {profile.reference?.day.slice(0, 10) ?? profile.settings.updatedAt.slice(0, 10)}</p>
            <button onClick={() => setConfigure(true)}>Cambiar objetivo</button>
            <p><a href={profile.methodSource} target="_blank" rel="noreferrer">Metodología de la referencia</a></p>
          </article>
        </div>
        <div className="nut-actions">{["catalog", "history", "meals"].map((key) =>
          <button key={key} onClick={() => setView(key)}>{sections[key]}</button>)}</div>
        <section className="nut-stack">
          <h2>Alimentos recomendados</h2>
          {suggested.loading && <p role="status">Cargando recomendaciones…</p>}
          {suggested.data?.length ? <div className="nut-grid">{suggested.data.map((food) =>
            <FoodCard key={food.id} food={food} favorite={favorites.data?.favorites.includes(food.id) ?? false} {...{ toggle, details, log }} />)}</div>
            : suggested.data && <p>Explora el catálogo para consultar alimentos y porciones.</p>}
        </section>
        <section className="nut-panel nut-stack">
          <h2>Registros de hoy</h2>
          {daily.data && (daily.data.entries.length ? <>
            <Distribution values={daily.data.meals} />
            <EntryList entries={daily.data.entries} {...{ edit, remove, details }} />
            {daily.data.total > daily.data.pageSize && <button onClick={() => setView("history")}>Ver todos los registros</button>}
          </> : <p>Hoy todavía no hay registros.</p>)}
        </section>
      </>}
      {view === "catalog" && <FoodCatalog {...{ version, toggle, details, log, retry }} />}
      {view === "history" && <History today={profile.today} {...{ version, edit, remove, details, retry }} />}
      {view === "meals" && <section className="nut-stack"><h2>Ideas de comidas</h2>
        <p>Combinaciones flexibles con alimentos del catálogo. Los tiempos presuponen que los ingredientes principales están listos.</p>
        {ideas.loading && <p role="status">Cargando ideas…</p>}
        {ideas.error && <p role="alert">{ideas.error} <button onClick={retry}>Reintentar</button></p>}
        {ideas.data?.length === 0 && <p>Sin ideas compatibles con los filtros del perfil.</p>}
        <div className="nut-grid">{ideas.data?.map((idea) => <article className="nut-panel" key={idea.name}>
          <FoodImage id={idea.id} />
          <h3>{idea.name}</h3><strong>{grams(idea.protein)} de proteína estimada · {idea.minutes} min</strong>
          <ul>{idea.ingredients.map((food) => <li key={food.id}>{food.name} · {grams(food.grams)}</li>)}</ul>
          <p>{idea.steps}</p><small>Alérgenos identificados · {idea.allergens.join(", ") || "Sin alérgenos consignados"}</small>
        </article>)}</div>
      </section>}
    </>}
    {dialog?.type === "details" && <FoodDetail food={dialog.food} close={() => setDialog(null)} favorite={favorites.data?.favorites.includes(dialog.food.id) ?? false} {...{ toggle, log }} />}
    {dialog?.type === "entry" && profile && <EntryForm food={dialog.food} entry={dialog.entry} day={profile.today} today={profile.today} close={() => setDialog(null)} saved={saved} />}
  </main>;
}
