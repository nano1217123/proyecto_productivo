"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/context/AuthContext";
import { muscleGroups } from "../lib/muscleGroups";
import { ExerciseListSkeleton } from "@/components/ui/Skeleton";

export default function ExercisesPage({ gym = "jj-poblado" }) {
  const { loading, logout } = useAuth();

  if (loading) return <ExerciseListSkeleton />;

  return <main className="member-home exercise-home">
    <header className="member-header"><Link className="gym-logo" href={`/dashboard?gym=${encodeURIComponent(gym)}`}><span className="gym-logo-mark">GYM</span><span>Ejercicios</span></Link><button className="member-logout" type="button" onClick={logout}>Cerrar sesion</button></header>
    <section className="exercise-heading"><Link className="back-link" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>&larr; Inicio</Link><p className="gym-kicker">ENTRENAMIENTO</p><h1>Elige un grupo muscular</h1><p>Selecciona una categoria para conocer ejercicios enfocados en esa zona.</p></section>
    <section className="muscle-grid" aria-label="Grupos musculares">
      {muscleGroups.map((group, index) => <Link className="muscle-card" key={group.slug} href={`/dashboard/ejercicios/${group.slug}?gym=${encodeURIComponent(gym)}`}><span>{String(index + 1).padStart(2, "0")}</span><h2>{group.name}</h2><p>{group.exercises.length} ejercicios</p><b aria-hidden="true">&rarr;</b></Link>)}
    </section>
  </main>;
}