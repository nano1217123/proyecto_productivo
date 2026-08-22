"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { calculateBmi, getBmiStatus, getProteinTarget, goals, getFoodsByGoal } from "../lib/nutrition";

function NutritionCalculator({ gym }) {
  const { user, loading, logout } = useAuth();

  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [goal, setGoal] = useState("mantener");
  const [selectedFoods, setSelectedFoods] = useState(() => new Set());

  const bmi = useMemo(() => calculateBmi(weight, height), [weight, height]);
  const bmiStatus = bmi ? getBmiStatus(bmi) : null;
  const proteinTarget = useMemo(() => getProteinTarget(weight, goal), [weight, goal]);
  const goalInfo = goals.find((item) => item.value === goal);
  const availableFoods = useMemo(() => getFoodsByGoal(goal), [goal]);

  const totalProtein = useMemo(
    () => availableFoods.filter((food) => selectedFoods.has(food.name)).reduce((sum, food) => sum + food.proteinPerServing, 0),
    [availableFoods, selectedFoods]
  );
  const progressPercent = proteinTarget ? Math.min(100, Math.round((totalProtein / proteinTarget) * 100)) : 0;
  const goalReached = proteinTarget && totalProtein >= proteinTarget;

  function toggleFood(name) {
    setSelectedFoods((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (loading || !user) return <div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>;

  return (
    <main className="member-home exercise-home">
      <header className="member-header">
        <Link className="gym-logo" href={`/dashboard?gym=${encodeURIComponent(gym)}`}><span className="gym-logo-mark">GYM</span><span>Nutricion</span></Link>
        <button className="member-logout" type="button" onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="exercise-heading">
        <Link className="back-link" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>&larr; Inicio</Link>
        <p className="gym-kicker">BIENESTAR</p>
        <h1>Calcula tu proteína diaria</h1>
        <p>Ingresa tu peso, estatura y objetivo para conocer una meta de proteína orientativa, y elige los alimentos que prefieras hasta alcanzarla.</p>
      </section>

      <section className="nutrition-layout">
        <div className="nutrition-card">
          <h2 className="nutrition-card-title">Tus datos</h2>
          <div className="bmi-fields">
            <label htmlFor="nutri-weight">Peso<div className="bmi-input"><input id="nutri-weight" type="number" min="1" max="500" value={weight} onChange={(event) => setWeight(event.target.value)} /><span>kg</span></div></label>
            <label htmlFor="nutri-height">Estatura<div className="bmi-input"><input id="nutri-height" type="number" min="1" max="300" value={height} onChange={(event) => setHeight(event.target.value)} /><span>cm</span></div></label>
          </div>

          <p className="nutrition-label">¿Cuál es tu objetivo?</p>
          <div className="nutrition-goal-group" role="radiogroup" aria-label="Objetivo">
            {goals.map((item) => (
              <button key={item.value} type="button" role="radio" aria-checked={goal === item.value} className={`nutrition-goal-btn ${goal === item.value ? "is-active" : ""}`} onClick={() => setGoal(item.value)}>
                {item.label}
              </button>
            ))}
          </div>

          <div className={`bmi-result ${bmiStatus ? `bmi-${bmiStatus.tone}` : ""}`} aria-live="polite">
            <div><span>Tu índice de masa corporal</span><b>{bmiStatus ? bmiStatus.label : "Ingresa valores válidos"}</b><small>{bmiStatus?.detail}</small></div>
            <strong>{bmi ? bmi.toFixed(1) : "—"}</strong>
          </div>

          <div className="protein-target-box">
            <span>Meta diaria de proteína ({goalInfo?.label.toLowerCase()})</span>
            <strong>{proteinTarget ? `${proteinTarget} g` : "—"}</strong>
            <p>{goalInfo?.hint}</p>
          </div>

          <p className="bmi-note">El IMC y la meta de proteína son referencias generales (basadas en tu peso corporal) y no sustituyen la valoración de un nutricionista o médico.</p>
        </div>

        <div className="nutrition-card">
          <h2 className="nutrition-card-title">Elige tus alimentos</h2>
          <p className="nutrition-card-subtitle">Son opciones para escoger, no una obligación. Marca los que quieras comer hoy y mira cuánta proteína vas sumando.</p>

          <div className="protein-progress" aria-live="polite">
            <div className="protein-progress-bar"><div className="protein-progress-fill" style={{ width: `${progressPercent}%` }} /></div>
            <div className="protein-progress-label">
              <span>{totalProtein} g de {proteinTarget || "—"} g</span>
              <span>{progressPercent}%</span>
            </div>
            {goalReached && <p className="success-box" style={{ marginTop: 12, marginBottom: 0 }}>¡Alcanzaste tu meta de proteína del día! Ya elegiste suficiente con estas opciones.</p>}
          </div>

          <div className="food-list">
            {availableFoods.map((food) => {
              const active = selectedFoods.has(food.name);
              return (
                <button key={food.name} type="button" className={`food-item ${active ? "is-selected" : ""}`} onClick={() => toggleFood(food.name)} aria-pressed={active}>
                  <span className="food-item-check" aria-hidden="true">{active ? "✓" : ""}</span>
                  <span className="food-item-info">
                    <span className="food-item-name">{food.name}</span>
                    <span className="food-item-serving">{food.category} · {food.serving}</span>
                  </span>
                  <span className="food-item-protein">{food.proteinPerServing} g</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function NutritionPage({ gym = "jj-poblado" }) {
  return (
    <Suspense fallback={<div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>}>
      <NutritionCalculator gym={gym} />
    </Suspense>
  );
}
