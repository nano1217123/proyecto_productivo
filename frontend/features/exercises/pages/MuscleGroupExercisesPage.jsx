"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { muscleGroupBySlug } from "../lib/muscleGroupCatalog";

export default function MuscleGroupExercisesPage({ groupSlug, gym = "jj-poblado" }) {
  const { user, loading, logout } = useAuth(); const router = useRouter(); const group = muscleGroupBySlug[groupSlug];
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (!loading && user && !group) router.replace(`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`); }, [loading, user, group, gym, router]);
  if (loading || !user || !group) return <div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>;
  return <main className="member-home exercise-home"><header className="member-header"><Link className="gym-logo" href={`/dashboard?gym=${encodeURIComponent(gym)}`}><span className="gym-logo-mark">GYM</span><span>Ejercicios</span></Link><button className="member-logout" type="button" onClick={logout}>Cerrar sesion</button></header><section className="exercise-heading"><Link className="back-link" href={`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`}>&larr; Grupos musculares</Link><p className="gym-kicker">{group.name.toUpperCase()}</p><h1>Ejercicios de {group.name.toLowerCase()}</h1><p>Incluye estos movimientos en tu rutina de acuerdo con tu nivel y objetivo.</p></section><section className="exercise-list" aria-label={`Ejercicios de ${group.name}`}>{group.exercises.map((exercise, index) => <article className="exercise-item" key={exercise}><span>{String(index + 1).padStart(2, "0")}</span><h2>{exercise}</h2><p>Revisa la tecnica antes de aumentar el peso.</p></article>)}</section></main>;
}
