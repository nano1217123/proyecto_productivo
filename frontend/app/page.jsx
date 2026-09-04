"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

const gyms = [
  {
    slug: "jj-poblado",
    initials: "JP",
    name: "JJ GYM El Poblado",
    location: "El Poblado · Medellín",
    plan: "Sede Principal · VIP & Crossfit",
    accent: "emerald",
    activeUsers: 48,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop",
  },
  {
    slug: "power-laureles",
    initials: "PL",
    name: "Power Laureles",
    location: "Laureles · Medellín",
    plan: "Zona Powerlifting & Calistenia",
    accent: "orange",
    activeUsers: 32,
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    slug: "fit-belén",
    initials: "FB",
    name: "Fit Lab Belén",
    location: "Belén · Medellín",
    plan: "Cardio HIIT & Nutrición",
    accent: "violet",
    activeUsers: 27,
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop",
  },
];

function getBmiStatus(bmi) {
  if (bmi < 18.5) return { label: "Bajo peso", detail: "Rango a reforzar", tone: "low" };
  if (bmi < 25) return { label: "Peso óptimo", detail: "Estado saludable", tone: "normal" };
  if (bmi < 30) return { label: "Sobrepeso", detail: "Rango a vigilar", tone: "high" };
  return { label: "Obesidad", detail: "Requiere seguimiento", tone: "high" };
}

export default function Home() {
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % gyms.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const bmi = useMemo(() => {
    const w = Number(weight);
    const h = Number(height) / 100;
    return w && h ? w / (h * h) : null;
  }, [weight, height]);

  const bmiStatus = bmi ? getBmiStatus(bmi) : null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_82%_7%,rgba(181,108,255,0.12),transparent_24rem),radial-gradient(circle_at_12%_65%,rgba(255,159,67,0.07),transparent_28rem),#242424]">
      {/* Video de Fondo */}
      <div className="absolute inset-x-0 top-0 h-[820px] overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover saturate-125 contrast-110"
          poster="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-man-holding-a-weight-in-a-gym-42796-large.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#242424]/75 via-[#242424]/95 to-[#242424]" />
      </div>

      {/* Navegación */}
      <nav className="relative z-[2] w-[calc(100%-48px)] max-w-[1160px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href="/">
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">🏋️‍♂️</span>
          <span>
            JJ <span>GYM SYSTEM</span>
          </span>
        </Link>
        <div className="hidden md:flex gap-8 [&_a]:text-[13px] [&_a]:text-[#a9afa7] [&_a]:no-underline [&_a]:transition [&_a:hover]:text-[#b56cff]">
          <a href="#instalaciones">Instalaciones</a>
          <a href="#sedes">Sedes</a>
          <a href="#imc">Diagnóstico IMC</a>
        </div>
        <div className="flex items-center gap-[26px]">
          <Link href="/login" className="text-[13px] text-[#a9afa7] no-underline transition hover:text-[#b56cff]">Ingresar</Link>
          <Link href="/register" className="px-4 py-2.5 bg-[#b56cff] text-[#10110f] border-0 rounded-lg font-bold text-[13px] cursor-pointer whitespace-nowrap transition hover:bg-[#d7adff] hover:-translate-y-px">Unirme Ahora</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-[2] w-[calc(100%-48px)] max-w-[1160px] mx-auto py-12" id="imc">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10 lg:gap-14">
          
          {/* Columna Izquierda: Texto Hero */}
          <div className="flex flex-col">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 border border-[rgba(181,108,255,0.4)] rounded-full bg-[rgba(181,108,255,0.15)] text-[#d7adff] text-[11px] font-extrabold tracking-wider w-fit">
              <span className="w-2 h-2 rounded-full bg-[#5bd48f] shadow-[0_0_8px_#5bd48f] animate-pulse" />
              SISTEMA DE GESTIÓN DEPORTIVA
            </div>
            
            <h1 className="text-[clamp(42px,7vw,80px)] font-extrabold tracking-[-4px] leading-[0.94] m-0">
              POTENCIA TU <em className="text-[#b56cff] font-normal font-serif not-italic">ENTRENAMIENTO.</em>
            </h1>
            
            <p className="max-w-[500px] mt-6 mb-8 text-base leading-[1.65] text-[#a9afa7]">
              Acceso unificado a salas de fuerza, seguimiento de nutrientes y control
              de membresías en tiempo real.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/register" className="px-7 py-3.5 bg-[#b56cff] text-[#10110f] border-0 rounded-lg font-bold text-[13px] cursor-pointer whitespace-nowrap transition hover:bg-[#d7adff] hover:-translate-y-px">
                Comenzar Entrenamiento
              </Link>
              <a className="text-[13px] text-[#a9afa7] no-underline transition hover:text-[#b56cff]" href="#sedes">
                Ver Sedes Disponibles ↓
              </a>
            </div>

            <div className="flex items-center gap-6 mt-10 pt-6 border-t border-[#30332f]">
              <div>
                <strong className="block text-2xl font-extrabold text-[#d7adff] leading-none">+130</strong>
                <span className="block mt-1 text-[11.5px] font-semibold text-[#a9afa7]">EJERCICIOS GUIADOS</span>
              </div>
              <div className="w-px h-7 bg-[#30332f]" />
              <div>
                <strong className="block text-2xl font-extrabold text-[#d7adff] leading-none">13</strong>
                <span className="block mt-1 text-[11.5px] font-semibold text-[#a9afa7]">GRUPOS MUSCULARES</span>
              </div>
              <div className="w-px h-7 bg-[#30332f]" />
              <div>
                <strong className="block text-2xl font-extrabold text-[#d7adff] leading-none">3</strong>
                <span className="block mt-1 text-[11.5px] font-semibold text-[#a9afa7]">SEDES ACTIVAS</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Calculadora IMC */}
          <aside className="w-full max-w-[425px] lg:justify-self-end p-7 border border-[#383c35] rounded-[18px] bg-[#1c1e1b] shadow-[0_22px_45px_rgba(0,0,0,.4)]">
            <div className="mb-5">
              <p className="m-0 mb-1 text-[10px] font-extrabold tracking-[2px] text-[#b56cff]">EVALUACIÓN FÍSICA</p>
              <h2 className="m-0 text-[29px] tracking-[-1px]">Calculadora IMC</h2>
              <span className="block mt-1 text-[13px] leading-[1.5] text-[#a9afa7]">Punto de partida para tu plan.</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <label className="text-xs font-bold text-[#c0c7bd]">
                Peso (kg)
                <div className="flex items-center mt-2 border-b border-[#4b504a] transition focus-within:border-[#b56cff]">
                  <input 
                    id="weight" 
                    type="number" 
                    value={weight} 
                    onChange={(e) => setWeight(e.target.value)} 
                    className="w-full py-2 border-0 outline-0 bg-transparent text-[#f2f4ef] text-[22px] font-bold"
                  />
                  <span className="text-[#b56cff] text-xs font-extrabold">KG</span>
                </div>
              </label>

              <label className="text-xs font-bold text-[#c0c7bd]">
                Estatura (cm)
                <div className="flex items-center mt-2 border-b border-[#4b504a] transition focus-within:border-[#b56cff]">
                  <input 
                    id="height" 
                    type="number" 
                    value={height} 
                    onChange={(e) => setHeight(e.target.value)} 
                    className="w-full py-2 border-0 outline-0 bg-transparent text-[#f2f4ef] text-[22px] font-bold"
                  />
                  <span className="text-[#b56cff] text-xs font-extrabold">CM</span>
                </div>
              </label>
            </div>

            <div className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-4 border-l-4 rounded-sm ${
              bmiStatus?.tone === "low" 
                ? "border-[#4caed3] bg-[#172c34]" 
                : bmiStatus?.tone === "high" 
                ? "border-[#dc914f] bg-[#362417]" 
                : "border-[#b56cff] bg-[#321d47]"
            }`}>
              <div>
                <span className="block text-[11px] text-[#b7c5ae]">DIAGNÓSTICO ESTIMADO</span>
                <b className={`block mt-1 text-base ${
                  bmiStatus?.tone === "low" 
                    ? "text-[#79cbeb]" 
                    : bmiStatus?.tone === "high" 
                    ? "text-[#f2b276]" 
                    : "text-[#d7adff]"
                }`}>
                  {bmiStatus ? bmiStatus.label : "Ingresa datos"}
                </b>
                <small className="block mt-0.5 text-[11px] text-[#9ba995]">{bmiStatus?.detail}</small>
              </div>
              <strong className={`text-[40px] leading-none ${
                bmiStatus?.tone === "low" 
                  ? "text-[#79cbeb]" 
                  : bmiStatus?.tone === "high" 
                  ? "text-[#f2b276]" 
                  : "text-[#d7adff]"
              }`}>
                {bmi ? bmi.toFixed(1) : "—"}
              </strong>
            </div>
          </aside>
        </div>
      </section>

      {/* Carrusel Instalaciones - CORREGIDO */}
      <section className="relative z-[2] w-[calc(100%-48px)] max-w-[1160px] mx-auto py-7 pb-16 border-t border-[#30332f]" id="instalaciones">
        <div className="flex items-end justify-between gap-8 mb-[26px]">
          <div>
            <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">EQUIPAMIENTO & ZONAS</p>
            <h2 className="m-0 text-[clamp(27px,3vw,38px)] tracking-[-1.8px]">Explora las Instalaciones</h2>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-[#41433f] bg-[#1c1e1b]">
          {/* Contenedor de la imagen con aspect ratio fijo */}
          <div className="relative w-full pt-[56.25%] bg-[#141514]">
            {gyms.map((gym, idx) => (
              <div
                key={gym.slug}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === activeSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <img
                  src={gym.image}
                  alt={gym.name}
                  className="w-full h-full object-cover object-center"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
                {/* Overlay con gradiente para el texto */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <h3 className="m-0 text-2xl text-white font-bold">{gym.name}</h3>
                  <p className="m-[4px_0_0] text-sm font-semibold text-[#d7adff]">{gym.plan}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Indicadores del carrusel */}
          <div className="flex justify-center gap-2.5 p-4 bg-[#1c1e1b]">
            {gyms.map((_, idx) => (
              <button
                key={idx}
                className={`w-3 h-3 rounded-full border-0 cursor-pointer transition-all ${
                  idx === activeSlide 
                    ? "bg-[#b56cff] scale-110 shadow-[0_0_12px_rgba(181,108,255,0.5)]" 
                    : "bg-[#41433f] hover:bg-[#5a5d57]"
                }`}
                onClick={() => setActiveSlide(idx)}
                aria-label={`Ver ${gyms[idx].name}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Sedes */}
      <section className="relative z-[2] w-[calc(100%-48px)] max-w-[1160px] mx-auto py-7 pb-16 border-t border-[#30332f]" id="sedes">
        <div className="flex items-end justify-between gap-8 mb-[26px]">
          <div>
            <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">SEDES ASOCIADAS</p>
            <h2 className="m-0 text-[clamp(27px,3vw,38px)] tracking-[-1.8px]">Selecciona tu Gimnasio</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
          {gyms.map((gym) => (
            <article 
              key={gym.slug}
              className={`relative min-h-[270px] flex flex-col justify-between overflow-hidden p-[22px] border rounded-[18px] bg-gradient-to-br from-[#353535] to-[#202020] shadow-[0_12px_28px_rgba(0,0,0,.35)] transition hover:-translate-y-2 hover:scale-[1.02] ${
                gym.accent === "orange" 
                  ? "border-[#ff9f43] hover:border-[#ff9f43]" 
                  : gym.accent === "violet" 
                  ? "border-[#b99af5] hover:border-[#b99af5]" 
                  : "border-[#494949] hover:border-[#b56cff]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-12 h-12 rounded-[14px] border border-[rgba(181,108,255,.35)] bg-[#321d47] text-[#b56cff] text-[13px] font-extrabold">
                  {gym.initials}
                </span>
                <span className="text-[11px] font-extrabold text-[#b56cff] inline-flex items-center gap-1.5">
                  <span className="w-[7px] h-[7px] rounded-full bg-[#5bd48f] shadow-[0_0_9px_#5bd48f]" />
                  {gym.activeUsers} entrenando ahora
                </span>
              </div>
              <div>
                <p className="m-0 mb-2 text-xs text-[#a9afa7]">{gym.location}</p>
                <h3 className="m-0 text-lg">{gym.name}</h3>
                <p className="m-[7px_0_0] text-[13px] text-[#a9afa7]">{gym.plan}</p>
              </div>
              <Link 
                className="flex items-center justify-between pt-4 border-t border-[#30332f] text-[13px] font-extrabold text-[#f2f4ef] no-underline group" 
                href={`/login?gym=${gym.slug}`}
              >
                Acceder a esta sede 
                <span className="text-xl text-[#b56cff] transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}