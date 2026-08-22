"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getSubscriptionStatus } from "../lib/subscription";

const gyms = {
  "jj-poblado": { name: "JJ GYM El Poblado", location: "El Poblado, Medellin" },
  "power-laureles": { name: "Power Laureles", location: "Laureles, Medellin" },
  "fit-belen": { name: "Fit Lab Belen", location: "Belen, Medellin" },
  "fit-bel\u00e9n": { name: "Fit Lab Belen", location: "Belen, Medellin" },
  "fit-bel\u00c3\u00a9n": { name: "Fit Lab Belen", location: "Belen, Medellin" },
};

const sections = [
  { title: "Ejercicios", eyebrow: "Entrenamiento", description: "Encuentra rutinas para fuerza, movilidad y rendimiento, organizadas para avanzar a tu ritmo.", marker: "01", className: "gym-section-exercises", href: "/dashboard/ejercicios" },
  { title: "Nutricion", eyebrow: "Bienestar", description: "Consulta recomendaciones para acompanar tu entrenamiento y construir habitos sostenibles.", marker: "02", className: "gym-section-nutrition" },
];

function GymMemberHomeContent() {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gymSlug = searchParams.get("gym") || "jj-poblado";
  const gym = gyms[gymSlug] || gyms["jj-poblado"];
  const subscription = getSubscriptionStatus(profile);
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  if (loading || !user) return <div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>;

  return <main className="member-home">
    <header className="member-header"><Link className="gym-logo" href="/" aria-label="Volver al inicio"><span className="gym-logo-mark">GYM</span><span>{gym.name}</span></Link><button className="member-logout" type="button" onClick={logout}>Cerrar sesion</button></header>
    <section className="member-welcome" aria-labelledby="member-title"><p className="gym-kicker">{gym.location}</p><h1 id="member-title">Hola, {profile?.nombres || "usuario"}.</h1><p>Tu espacio personal para entrenar y cuidar tu alimentacion.</p>{subscription && <span className={`member-status ${subscription.active ? "is-active" : "is-expired"}`}>{subscription.active ? "Suscripcion activa" : "Suscripcion vencida"}</span>}</section>
    <section className="member-sections" aria-label="Contenido principal">
      {sections.map((section) => <article className={`member-section ${section.className}`} key={section.title}><span className="member-section-number">{section.marker}</span><div><p className="member-section-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p>{section.description}</p></div>{section.href ? <Link className="member-section-action" href={`${section.href}?gym=${encodeURIComponent(gymSlug)}`}>Ver apartado <span aria-hidden="true">&rarr;</span></Link> : <button className="member-section-action" type="button">Ver apartado <span aria-hidden="true">&rarr;</span></button>}</article>)}
    </section>
  </main>;
}

export default function GymMemberHomePage() {
  return <Suspense fallback={<div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>}><GymMemberHomeContent /></Suspense>;
}
