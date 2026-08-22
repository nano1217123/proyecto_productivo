"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const gyms = [
  { slug: "jj-poblado", initials: "JP", name: "JJ GYM El Poblado", location: "El Poblado · Medellín, Antioquia", plan: "Entrenamiento integral", accent: "emerald" },
  { slug: "power-laureles", initials: "PL", name: "Power Laureles", location: "Laureles · Medellín, Antioquia", plan: "Fuerza y rendimiento", accent: "orange" },
  { slug: "fit-belén", initials: "FB", name: "Fit Lab Belén", location: "Belén · Medellín, Antioquia", plan: "Movimiento y bienestar", accent: "violet" },
];

// Devuelve la clasificación general de la OMS según el índice de masa corporal.
function getBmiStatus(bmi) {
  if (bmi < 18.5) return { label: "Bajo peso", detail: "Posible desnutrición", tone: "low" };
  if (bmi < 25) return { label: "Peso normal", detail: "Rango saludable", tone: "normal" };
  if (bmi < 30) return { label: "Sobrepeso", detail: "Rango a vigilar", tone: "high" };
  if (bmi < 35) return { label: "Obesidad grado I", detail: "Consulta a un profesional", tone: "high" };
  if (bmi < 40) return { label: "Obesidad grado II", detail: "Consulta a un profesional", tone: "high" };
  return { label: "Obesidad grado III", detail: "Consulta a un profesional", tone: "high" };
}

// Página pública: presenta JJ GYM y ofrece una herramienta útil sin iniciar sesión.
export default function Home() {
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);

  // IMC = peso en kg / (estatura en metros)².
  const bmi = useMemo(() => {
    const weightValue = Number(weight);
    const heightInMeters = Number(height) / 100;

    if (!weightValue || !heightInMeters || weightValue <= 0 || heightInMeters <= 0) {
      return null;
    }

    return weightValue / heightInMeters ** 2;
  }, [weight, height]);

  // Separamos el estado para reutilizar su texto y su color dentro de la tarjeta.
  const bmiStatus = bmi ? getBmiStatus(bmi) : null;

  return (
    <main className="gym-home">
      <nav className="gym-nav" aria-label="Navegación principal">
        <Link className="gym-logo" href="/" aria-label="JJ GYM, inicio">
          <span className="gym-logo-mark">JJ</span>
          <span>JJ <span>GYM</span></span>
        </Link>
        <div className="gym-nav-links"><a href="#beneficios">Beneficios</a><a href="#comunidad">Comunidad</a></div>
      </nav>

      <section className="gym-hero">
        <div className="gym-hero-copy">
          <p className="gym-kicker">ENTRENA SIN LÍMITES</p>
          <h1>Construye tu mejor <em>versión.</em></h1>
          <p className="gym-description">Un espacio diseñado para superar tus metas, cuidar tu bienestar y transformar la disciplina en resultados.</p>
          <div className="gym-actions"><a className="gym-secondary-link" href="#gimnasios">Conoce nuestros gimnasios</a></div>
        </div>

        {/* Los datos de esta tarjeta se procesan localmente y no se almacenan. */}
        <aside className="bmi-card" aria-labelledby="bmi-title">
          <div className="bmi-card-heading"><p>HERRAMIENTA JJ GYM</p><h2 id="bmi-title">Calcula tu IMC</h2><span>Conoce un punto de partida para tu entrenamiento.</span></div>
          <div className="bmi-fields">
            <label htmlFor="weight">Peso<div className="bmi-input"><input id="weight" type="number" min="1" max="500" value={weight} onChange={(event) => setWeight(event.target.value)} /><span>kg</span></div></label>
            <label htmlFor="height">Estatura<div className="bmi-input"><input id="height" type="number" min="1" max="300" value={height} onChange={(event) => setHeight(event.target.value)} /><span>cm</span></div></label>
          </div>
          <div className={`bmi-result ${bmiStatus ? `bmi-${bmiStatus.tone}` : ""}`} aria-live="polite">
            <div><span>Tu índice de masa corporal</span><b>{bmiStatus ? bmiStatus.label : "Ingresa valores válidos"}</b><small>{bmiStatus?.detail}</small></div>
            <strong>{bmi ? bmi.toFixed(1) : "—"}</strong>
          </div>
          <div className="bmi-scale" aria-hidden="true"><i /><i /><i /><i /></div>
          <p className="bmi-note">El IMC es una referencia general y no sustituye la valoración de un profesional de la salud.</p>
        </aside>
      </section>

      <section className="tenant-section" id="gimnasios" aria-labelledby="gyms-title">
        <div className="tenant-section-heading">
          <div><p className="gym-kicker">ELIGE TU SEDE</p><h2 id="gyms-title">Ingresa a tu gimnasio</h2></div>
          <p>Selecciona el gimnasio al que perteneces para iniciar sesión en su espacio privado.</p>
        </div>
        <div className="tenant-grid">
          {gyms.map((gym) => (
            <article className={`tenant-card tenant-card-${gym.accent}`} key={gym.slug}>
              <div className="tenant-card-top"><span className="tenant-badge">{gym.initials}</span><span className="tenant-status">Disponible</span></div>
              <div><p className="tenant-location">{gym.location}</p><h3>{gym.name}</h3><p className="tenant-plan">{gym.plan}</p></div>
              <Link className="tenant-access" href={`/login?gym=${gym.slug}`} aria-label={`Iniciar sesión en ${gym.name}`}>Acceder <span>→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="gym-benefits" id="beneficios">
        <article><span>01</span><h2>Entrena a tu ritmo</h2><p>Planes y herramientas que se adaptan a tu objetivo.</p></article>
        <article><span>02</span><h2>Supera tus marcas</h2><p>Haz seguimiento de cada avance y mantente enfocado.</p></article>
        <article id="comunidad"><span>03</span><h2>Una comunidad real</h2><p>Comparte el esfuerzo con personas que te impulsan.</p></article>
      </section>
    </main>
  );
}
