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
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop",
  },
  {
    slug: "power-laureles",
    initials: "PL",
    name: "Power Laureles",
    location: "Laureles · Medellín",
    plan: "Zona Powerlifting & Calistenia",
    accent: "orange",
    activeUsers: 32,
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop",
  },
  {
    slug: "fit-belén",
    initials: "FB",
    name: "Fit Lab Belén",
    location: "Belén · Medellín",
    plan: "Cardio HIIT & Nutrición",
    accent: "violet",
    activeUsers: 27,
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1000&auto=format&fit=crop",
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

  // Carrusel automático para las imágenes de instalaciones
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
    <main className="gym-home">
      {/* CAPA 1: Video de Fondo Deportivo con Filtro Gradiente */}
      <div className="hero-video-wrapper">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="hero-video"
          poster="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-man-holding-a-weight-in-a-gym-42796-large.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero-video-overlay" />
      </div>

      {/* Navegación */}
      <nav className="gym-nav">
        <Link className="gym-logo" href="/">
          <span className="gym-logo-mark">🏋️‍♂️</span>
          <span>
            JJ <span>GYM SYSTEM</span>
          </span>
        </Link>
        <div className="gym-nav-links">
          <a href="#instalaciones">Instalaciones</a>
          <a href="#sedes">Sedes</a>
          <a href="#imc">Diagnóstico IMC</a>
        </div>
        <div className="gym-actions">
          <Link href="/login" className="gym-secondary-link">Ingresar</Link>
          <Link href="/register" className="btn-primary-small">Unirme Ahora</Link>
        </div>
      </nav>

      {/* Hero Principal */}
      <section className="gym-hero">
        <div className="gym-hero-copy">
          <div className="live-badge">
            <span className="pulse-dot" /> SISTEMA DE GESTIÓN DEPORTIVA
          </div>
          <h1>
            POTENCIA TU <em>ENTRENAMIENTO.</em>
          </h1>
          <p className="gym-description">
            Acceso unificado a salas de fuerza, seguimiento de nutrientes y control
            de membresías en tiempo real.
          </p>

          <div className="gym-actions">
            <Link href="/register" className="btn-primary-small" style={{ padding: "14px 28px" }}>
              Comenzar Entrenamiento
            </Link>
            <a className="gym-secondary-link" href="#sedes">
              Ver Sedes Disponibles ↓
            </a>
          </div>

          <div className="hero-stats-bar">
            <div className="hero-stat-item">
              <strong>+130</strong>
              <span>EJERCICIOS GUIADOS</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <strong>13</strong>
              <span>GRUPOS MUSCULARES</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <strong>3</strong>
              <span>SEDES ACTIVAS</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Calculadora de IMC */}
        <aside className="bmi-card" id="imc">
          <div className="bmi-card-heading">
            <p>EVALUACIÓN FÍSICA</p>
            <h2>Calculadora IMC</h2>
            <span>Punto de partida para tu plan.</span>
          </div>

          <div className="bmi-fields">
            <label htmlFor="weight">
              Peso (kg)
              <div className="bmi-input">
                <input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
                <span>KG</span>
              </div>
            </label>

            <label htmlFor="height">
              Estatura (cm)
              <div className="bmi-input">
                <input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                <span>CM</span>
              </div>
            </label>
          </div>

          <div className={`bmi-result ${bmiStatus ? `bmi-${bmiStatus.tone}` : ""}`}>
            <div>
              <span>DIAGNÓSTICO ESTIMADO</span>
              <b>{bmiStatus ? bmiStatus.label : "Ingresa datos"}</b>
              <small>{bmiStatus?.detail}</small>
            </div>
            <strong>{bmi ? bmi.toFixed(1) : "—"}</strong>
          </div>
        </aside>
      </section>

      {/* Carrusel Visual de Instalaciones */}
      <section className="tenant-section" id="instalaciones">
        <div className="tenant-section-heading">
          <div>
            <p className="gym-kicker">EQUIPAMIENTO & ZONAS</p>
            <h2>Explora las Instalaciones</h2>
          </div>
        </div>

        <div className="facility-carousel">
          <div
            className="carousel-image-box"
            style={{ backgroundImage: `url(${gyms[activeSlide].image})` }}
          >
            <div className="carousel-caption">
              <h3>{gyms[activeSlide].name}</h3>
              <p>{gyms[activeSlide].plan}</p>
            </div>
          </div>
          <div className="carousel-dots">
            {gyms.map((_, idx) => (
              <button
                key={idx}
                className={`dot ${idx === activeSlide ? "active" : ""}`}
                onClick={() => setActiveSlide(idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Tarjetas de Sedes con contador de usuarios en vivo */}
      <section className="tenant-section" id="sedes">
        <div className="tenant-section-heading">
          <div>
            <p className="gym-kicker">SEDES ASOCIADAS</p>
            <h2>Selecciona tu Gimnasio</h2>
          </div>
        </div>

        <div className="tenant-grid">
          {gyms.map((gym) => (
            <article className={`tenant-card tenant-card-${gym.accent}`} key={gym.slug}>
              <div className="tenant-card-top">
                <span className="tenant-badge">{gym.initials}</span>
                <span className="tenant-status active-now">
                  🟢 {gym.activeUsers} entrenando ahora
                </span>
              </div>
              <div>
                <p className="tenant-location">{gym.location}</p>
                <h3>{gym.name}</h3>
                <p className="tenant-plan">{gym.plan}</p>
              </div>
              <Link className="tenant-access" href={`/login?gym=${gym.slug}`}>
                Acceder a esta sede <span>→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}