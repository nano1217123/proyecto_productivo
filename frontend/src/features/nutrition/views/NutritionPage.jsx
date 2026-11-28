"use client";

import { useState } from "react";
import Link from "next/link";
import { nutritionApi } from "../api/nutritionApi";
import { useNutritionData } from "../hooks/useNutritionData";
import ProfileForm from "../components/ProfileForm";
import FoodImage from "../components/FoodImage";
import FoodCatalog from "../components/FoodCatalog";
import History from "../components/History";
import { EntryForm, FoodDetail } from "../components/FoodDialogs";
import { grams } from "../components/labels";
import { DailyProtein, GoalSummary, Recommendations, TodayMeals, WeeklyProtein } from "../components/NutritionOverview";
import "./nutrition.css";

const sections = { overview: "Resumen", catalog: "Alimentos", history: "Historial", meals: "Ideas de comidas" };

export default function NutritionPage({ gym }) {
  const [view, setView] = useState("overview");
  const [catalogMeal, setCatalogMeal] = useState(null);
  const [configure, setConfigure] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const profileResult = useNutritionData("perfil", {}, version);
  const profile = profileResult.data;
  const ready = Boolean(profile?.settings);
  const daily = useNutritionData(ready && !configure && view === "overview" ? "registros" : null, { day: profile?.today }, version);
  const weekly = useNutritionData(ready && !configure && view === "overview" ? "registros" : null, { day: profile?.today, days: 7 }, version);
  const suggested = useNutritionData(ready && view === "overview" ? "recomendaciones" : null, {}, version);
  const favorites = useNutritionData(ready || view === "catalog" ? "alimentos" : null, { favorite: "true" }, version);
  const ideas = useNutritionData(view === "meals" ? "comidas" : null, {}, version);
  const retry = () => setVersion((value) => value + 1);
  const details = (food) => setDialog({ type: "details", food });
  const log = profile?.settings?.tracking ? (food) => setDialog({ type: "entry", food, meal: view === "catalog" ? catalogMeal : null }) : undefined;
  function navigate(section) {
    setCatalogMeal(null);
    setView(section);
  }
  function explore(meal = null) {
    setCatalogMeal(meal);
    setView("catalog");
  }
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
        <h1>Mi nutrición</h1><p>Complementa tu entrenamiento.</p></div>
      {ready && <button className="nut-icon" aria-label={configure ? "Cerrar configuración" : "Configuración nutricional"} onClick={() => setConfigure(!configure)}>{configure ? "×" : "⚙"}</button>}
    </header>
    {(profileResult.loading || daily.loading) && <p role="status">Cargando información nutricional…</p>}
    {(error || profileResult.error || daily.error || weekly.error || suggested.error || favorites.error) &&
      <p role="alert" className="nut-panel">{error || profileResult.error || daily.error || weekly.error || suggested.error || favorites.error} <button onClick={() => { setError(""); retry(); }}>Reintentar</button></p>}
    {status && <p role="status" className="nut-status">{status}</p>}
    {profile && (configure || !ready) && <ProfileForm profile={profile} saved={saved} close={() => setConfigure(false)} />}
    {!configure && profile && <>
      {view === "overview" && ready && <div className="nut-overview">
        <GoalSummary profile={profile} configure={() => setConfigure(true)} />
        <DailyProtein reference={profile.reference?.currentEstimate} methodSource={profile.methodSource}
          data={daily.data} tracking={profile.settings.tracking} explore={explore} />
        <Recommendations result={suggested} favorites={favorites.data?.favorites ?? []} {...{ explore, toggle, details, log }} />
        <TodayMeals data={daily.data} tracking={profile.settings.tracking} history={() => navigate("history")} {...{ explore, edit, remove, details }} />
        <WeeklyProtein result={weekly} today={profile.today} />
      </div>}
      <nav className="nut-tabs" aria-label="Secciones de nutrición">{Object.entries(sections).map(([key, label]) =>
        <button key={key} aria-current={view === key ? "page" : undefined} onClick={() => navigate(key)}>{label}</button>)}</nav>
      {view === "catalog" && <FoodCatalog meal={catalogMeal} {...{ version, toggle, details, log, retry }} />}
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
    {dialog?.type === "entry" && profile && <EntryForm food={dialog.food} entry={dialog.entry} meal={dialog.meal} day={profile.today} today={profile.today} close={() => setDialog(null)} saved={saved} />}
  </main>;
}
