"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { muscleGroupBySlug } from "../lib/muscleGroupCatalog";
import { getExerciseAnatomy } from "../lib/muscleMap";
import BodyMuscleDiagram from "../components/BodyMuscleDiagram";
import { ExerciseGroupSkeleton } from "@/components/ui/Skeleton";

export default function ExerciseGroupPage({ groupSlug, gym = "jj-poblado" }) {
  const { loading, logout } = useAuth();
  const [selected, setSelected] = useState(null);
  const group = muscleGroupBySlug[groupSlug];
  const closeModal = () => setSelected(null);

  if (loading) return <ExerciseGroupSkeleton />;
  if (!group) return <main>Grupo no encontrado</main>;

  return (
    <main className="member-home exercise-home">
      <header className="member-header">
        <Link className="gym-logo" href={`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`}>
          <span className="gym-logo-mark">GYM</span><span>{group.name}</span>
        </Link>
        <button className="member-logout" type="button" onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="exercise-card-grid">
        {group.exercises.map((ex) => (
          <button key={ex.name} className="exercise-card" onClick={() => setSelected(ex)}>
            <h3>{ex.name}</h3>
          </button>
        ))}
      </section>

      {selected && (() => {
        const anatomy = getExerciseAnatomy(selected, groupSlug, group.name);
        return (
          <div className="exercise-modal-overlay" role="dialog" aria-modal="true" aria-label={selected.name} onClick={closeModal}>
            <div className="exercise-modal" onClick={(event) => event.stopPropagation()}>
              <button className="exercise-modal-close" type="button" onClick={closeModal} aria-label="Cerrar">&times;</button>
              <BodyMuscleDiagram primaryMuscles={anatomy.primaryIds} secondaryMuscles={anatomy.secondaryIds} accent={group.accent} />
              <div className="exercise-modal-body">
                <p className="gym-kicker" style={{ color: group.accent }}>{group.name.toUpperCase()}</p>
                <h2>{selected.name}</h2>
                <dl className="exercise-modal-meta">
                  <div><dt>Grupo</dt><dd>{anatomy.grupo}</dd></div>
                  <div><dt>Musculo principal</dt><dd>{anatomy.principal.map((m) => m.label).join(", ")}</dd></div>
                  <div><dt>Zona</dt><dd>{anatomy.principal.map((m) => m.zone).join(" · ")}</dd></div>
                  {anatomy.secundarios.length > 0 && (
                    <div><dt>Secundarios</dt><dd>{anatomy.secundarios.map((m) => m.label).join(", ")}</dd></div>
                  )}
                  <div><dt>Vista</dt><dd>{anatomy.vista}</dd></div>
                  <div><dt>Equipo</dt><dd>{selected.equipment}</dd></div>
                </dl>
                <p className="exercise-modal-description">{selected.description}</p>
                <p className="exercise-modal-tip"><strong>Consejo:</strong> {selected.tip}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}