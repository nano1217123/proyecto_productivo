"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { muscleGroupBySlug } from "../lib/muscleGroups";

// Silueta simple e ilustrativa (dibujada a mano, sin fotos externas) que
// resalta en color la zona muscular correspondiente al grupo seleccionado.
const HIGHLIGHT_REGIONS = {
  pecho: { cx: 50, cy: 34, rx: 19, ry: 10 },
  espalda: { cx: 50, cy: 36, rx: 20, ry: 16 },
  hombros: { cx: 50, cy: 26, rx: 26, ry: 7 },
  brazos: { cx: 50, cy: 42, rx: 30, ry: 8 },
  biceps: { cx: 50, cy: 40, rx: 28, ry: 6 },
  triceps: { cx: 50, cy: 44, rx: 28, ry: 6 },
  piernas: { cx: 50, cy: 72, rx: 15, ry: 24 },
  muslos: { cx: 50, cy: 64, rx: 16, ry: 14 },
  gluteos: { cx: 50, cy: 54, rx: 17, ry: 8 },
  pantorrillas: { cx: 50, cy: 86, rx: 12, ry: 10 },
  abdominales: { cx: 50, cy: 46, rx: 12, ry: 12 },
  cintura: { cx: 50, cy: 46, rx: 18, ry: 10 },
  "espalda-baja": { cx: 50, cy: 50, rx: 16, ry: 8 },
};

function MuscleSilhouette({ slug, accent }) {
  const region = HIGHLIGHT_REGIONS[slug] || HIGHLIGHT_REGIONS.pecho;
  return (
    <svg viewBox="0 0 100 130" className="exercise-modal-figure" role="img" aria-label={`Zona muscular trabajada: ${slug}`}>
      <ellipse cx="50" cy="12" rx="9" ry="10" fill="#3a3d38" />
      <path d="M35 22 Q50 18 65 22 L70 62 Q65 70 50 70 Q35 70 30 62 Z" fill="#3a3d38" />
      <path d="M30 26 L16 55 L23 58 L35 34 Z" fill="#33362f" />
      <path d="M70 26 L84 55 L77 58 L65 34 Z" fill="#33362f" />
      <path d="M38 68 L33 122 L43 122 L48 74 Z" fill="#33362f" />
      <path d="M62 68 L67 122 L57 122 L52 74 Z" fill="#33362f" />
      <ellipse cx={region.cx} cy={region.cy} rx={region.rx} ry={region.ry} fill={accent} opacity="0.85" />
    </svg>
  );
}

export default function ExerciseGroupPage({ groupSlug, gym = "jj-poblado" }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const group = muscleGroupBySlug[groupSlug];
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (!loading && user && !group) router.replace(`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`); }, [loading, user, group, gym, router]);

  useEffect(() => {
    function handleKeyDown(event) { if (event.key === "Escape") setSelected(null); }
    if (selected) { document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }
  }, [selected]);

  if (loading || !user || !group) return <div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>;

  return (
    <main className="member-home exercise-home">
      <header className="member-header">
        <Link className="gym-logo" href={`/dashboard?gym=${encodeURIComponent(gym)}`}><span className="gym-logo-mark">GYM</span><span>Ejercicios</span></Link>
        <button className="member-logout" type="button" onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="exercise-heading">
        <Link className="back-link" href={`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`}>&larr; Grupos musculares</Link>
        <p className="gym-kicker">{group.name.toUpperCase()}</p>
        <h1>Ejercicios de {group.name.toLowerCase()}</h1>
        <p>Toca cualquier ejercicio para ver como hacerlo, el musculo principal que trabaja y un consejo clave.</p>
      </section>

      <section className="exercise-card-grid" aria-label={`Ejercicios de ${group.name}`}>
        {group.exercises.map((exercise, index) => (
          <button
            className="exercise-card"
            key={exercise.name}
            type="button"
            style={{ "--accent": group.accent }}
            onClick={() => setSelected(exercise)}
          >
            <span className="exercise-card-number">{String(index + 1).padStart(2, "0")}</span>
            <h2>{exercise.name}</h2>
            <p className="exercise-card-primary">{exercise.primary}</p>
            <span className="exercise-card-cta">Ver detalle <b aria-hidden="true">&rarr;</b></span>
          </button>
        ))}
      </section>

      {selected && (
        <div className="exercise-modal-overlay" role="dialog" aria-modal="true" aria-label={selected.name} onClick={() => setSelected(null)}>
          <div className="exercise-modal" onClick={(event) => event.stopPropagation()}>
            <button className="exercise-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Cerrar">&times;</button>
            <MuscleSilhouette slug={group.slug} accent={group.accent} />
            <div className="exercise-modal-body">
              <p className="gym-kicker" style={{ color: group.accent }}>{group.name.toUpperCase()}</p>
              <h2>{selected.name}</h2>
              <dl className="exercise-modal-meta">
                <div><dt>Musculo principal</dt><dd>{selected.primary}</dd></div>
                <div><dt>Equipo</dt><dd>{selected.equipment}</dd></div>
              </dl>
              <p className="exercise-modal-description">{selected.description}</p>
              <p className="exercise-modal-tip"><strong>Consejo:</strong> {selected.tip}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
