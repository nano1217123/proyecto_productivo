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

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]"><p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Cargando...</p></div>;

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817] pb-20">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href={`/dashboard?gym=${encodeURIComponent(gym)}`}><span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span><span>Nutricion</span></Link>
        <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px] [&_h1]:m-0 [&_h1]:text-[clamp(34px,5vw,54px)] [&_h1]:tracking-[-1.8px] [&_h1]:leading-[1.05] [&_p:last-child]:max-w-[510px] [&_p:last-child]:mt-[15px] [&_p:last-child]:text-[15px] [&_p:last-child]:leading-[1.6] [&_p:last-child]:text-[#a9afa7]">
        <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>&larr; Inicio</Link>
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">BIENESTAR</p>
        <h1>Calcula tu proteína diaria</h1>
        <p>Ingresa tu peso, estatura y objetivo para conocer una meta de proteína orientativa, y elige los alimentos que prefieras hasta alcanzarla.</p>
      </section>

      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] items-start gap-[18px] pb-10">
        <div className="p-[26px] border border-[#41433f] rounded-xl bg-[#212320]">
          <h2 className="m-0 mb-[18px] text-xl tracking-[-0.4px]">Tus datos</h2>
          <div className="grid grid-cols-2 gap-[15px] my-[27px_0_22px] [&_label]:text-xs [&_label]:font-bold [&_label]:text-[#c0c7bd]">
            <label htmlFor="nutri-weight">Peso<div className="flex items-center mt-2 border-b border-[#4b504a] transition focus-within:border-[#b56cff] [&_input]:w-full [&_input]:min-w-0 [&_input]:py-2 [&_input]:border-0 [&_input]:outline-0 [&_input]:bg-transparent [&_input]:text-[#f2f4ef] [&_input]:text-[22px] [&_input]:font-bold [&_span]:text-[#b56cff] [&_span]:text-xs [&_span]:font-extrabold"><input id="nutri-weight" type="number" min="1" max="500" value={weight} onChange={(event) => setWeight(event.target.value)} /><span>kg</span></div></label>
            <label htmlFor="nutri-height">Estatura<div className="flex items-center mt-2 border-b border-[#4b504a] transition focus-within:border-[#b56cff] [&_input]:w-full [&_input]:min-w-0 [&_input]:py-2 [&_input]:border-0 [&_input]:outline-0 [&_input]:bg-transparent [&_input]:text-[#f2f4ef] [&_input]:text-[22px] [&_input]:font-bold [&_span]:text-[#b56cff] [&_span]:text-xs [&_span]:font-extrabold"><input id="nutri-height" type="number" min="1" max="300" value={height} onChange={(event) => setHeight(event.target.value)} /><span>cm</span></div></label>
          </div>

          <p className="m-0 mb-2.5 text-xs font-bold text-[#c0c7bd]">¿Cuál es tu objetivo?</p>
          <div className="grid gap-2 mb-[22px]" role="radiogroup" aria-label="Objetivo">
            {goals.map((item) => (
              <button key={item.value} type="button" role="radio" aria-checked={goal === item.value} className={`p-[11px_14px] border rounded-[10px] bg-[#151714] text-[#f2f4ef] text-[13.5px] font-semibold text-left cursor-pointer transition hover:border-[#b56cff] ${goal === item.value ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f]"}`} onClick={() => setGoal(item.value)}>
                {item.label}
              </button>
            ))}
          </div>

          <div className={`grid grid-cols-[1fr_auto] items-center gap-x-[15px] gap-y-1 p-[18px] border-l-4 rounded-sm [&_span]:block [&_span]:text-[11px] [&_span]:text-[#b7c5ae] [&_b]:block [&_b]:mt-1 [&_b]:text-base [&_small]:block [&_small]:mt-0.5 [&_small]:text-[11px] [&_small]:text-[#9ba995] [&_strong]:text-[40px] [&_strong]:leading-none ${bmiStatus?.tone === "low" ? "border-[#4caed3] bg-[#172c34] [&_b]:text-[#79cbeb] [&_strong]:text-[#79cbeb]" : bmiStatus?.tone === "high" ? "border-[#dc914f] bg-[#362417] [&_b]:text-[#f2b276] [&_strong]:text-[#f2b276]" : "border-[#b56cff] bg-[#321d47] [&_b]:text-[#d7adff] [&_strong]:text-[#d7adff]"}`} aria-live="polite">
            <div><span>Tu índice de masa corporal</span><b>{bmiStatus ? bmiStatus.label : "Ingresa valores válidos"}</b><small>{bmiStatus?.detail}</small></div>
            <strong>{bmi ? bmi.toFixed(1) : "—"}</strong>
          </div>

          <div className="mt-4 p-[16px_18px] border-l-4 border-[#ffb84d] rounded-sm bg-[#2c2416] [&_span]:block [&_span]:text-[11px] [&_span]:font-bold [&_span]:text-[#e3c793] [&_strong]:block [&_strong]:mt-1 [&_strong]:text-[30px] [&_strong]:text-[#ffc177] [&_p]:mt-2 [&_p]:text-[12.5px] [&_p]:leading-[1.5] [&_p]:text-[#cbb98d]">
            <span>Meta diaria de proteína ({goalInfo?.label.toLowerCase()})</span>
            <strong>{proteinTarget ? `${proteinTarget} g` : "—"}</strong>
            <p>{goalInfo?.hint}</p>
          </div>

          <p className="mt-4 text-[12px] leading-[1.5] text-[#a9afa7]">El IMC y la meta de proteína son referencias generales (basadas en tu peso corporal) y no sustituyen la valoración de un nutricionista o médico.</p>
        </div>

        <div className="p-[26px] border border-[#41433f] rounded-xl bg-[#212320]">
          <h2 className="m-0 mb-[18px] text-xl tracking-[-0.4px]">Elige tus alimentos</h2>
          <p className="m-[-10px_0_18px] text-[13px] leading-[1.55] text-[#a9afa7]">Son opciones para escoger, no una obligación. Marca los que quieras comer hoy y mira cuánta proteína vas sumando.</p>

          <div className="mb-[18px]" aria-live="polite">
            <div className="h-2.5 rounded-md bg-[#151714] overflow-hidden"><div className="h-full rounded-md bg-gradient-to-r from-[#8441c6] to-[#d7adff] transition-[width] duration-200" style={{ width: `${progressPercent}%` }} /></div>
            <div className="flex justify-between mt-2 text-[12.5px] font-semibold text-[#a9afa7]">
              <span>{totalProtein} g de {proteinTarget || "—"} g</span>
              <span>{progressPercent}%</span>
            </div>
            {goalReached && <p className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#251833] text-[#d7adff] text-[13px] leading-[1.5]" style={{ marginTop: 12, marginBottom: 0 }}>¡Alcanzaste tu meta de proteína del día! Ya elegiste suficiente con estas opciones.</p>}
          </div>

          <div className="grid gap-2 max-h-[480px] overflow-y-auto pr-1">
            {availableFoods.map((food) => {
              const active = selectedFoods.has(food.name);
              return (
                <button key={food.name} type="button" className={`grid grid-cols-[22px_1fr_auto] items-center gap-3 p-[12px_14px] border rounded-[10px] bg-[#151714] text-[#f2f4ef] text-left font-inherit cursor-pointer transition hover:border-[#b56cff] ${active ? "border-[#b56cff] bg-[#321d47]" : "border-[#41463f]"}`} onClick={() => toggleFood(food.name)} aria-pressed={active}>
                  <span className="grid place-items-center w-[22px] h-[22px] border border-[#5a5f56] rounded-md text-[#d7adff] text-[13px] font-extrabold" aria-hidden="true">{active ? "✓" : ""}</span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13.5px] font-semibold">{food.name}</span>
                    <span className="text-[11.5px] text-[#a9afa7]">{food.category} · {food.serving}</span>
                  </span>
                  <span className="text-[13px] font-extrabold text-[#d7adff] whitespace-nowrap">{food.proteinPerServing} g</span>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]"><p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Cargando...</p></div>}>
      <NutritionCalculator gym={gym} />
    </Suspense>
  );
}
