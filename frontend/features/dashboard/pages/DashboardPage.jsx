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
  { title: "Nutricion", eyebrow: "Bienestar", description: "Consulta recomendaciones para acompanar tu entrenamiento y construir habitos sostenibles.", marker: "02", className: "gym-section-nutrition", href: "/dashboard/nutricion" },
];

function MemberDashboard() {
  const { profile, loading, logout } = useAuth();
  const searchParams = useSearchParams();
  const gymSlug = searchParams.get("gym") || "jj-poblado";
  const gym = gyms[gymSlug] || gyms["jj-poblado"];
  const subscription = getSubscriptionStatus(profile);

if (loading) return <MemberDashboardSkeleton />;

  return <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">
    <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]"><Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href="/" aria-label="Volver al inicio"><span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span><span>{gym.name}</span></Link><button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>Cerrar sesion</button></header>
    <section className="w-full max-w-[1060px] mx-auto pt-[78px] pb-[42px] [&_h1]:m-0 [&_h1]:text-[clamp(36px,6vw,62px)] [&_h1]:tracking-[-2px] [&_h1]:leading-none [&_p:not(.gym-kicker)]:max-w-[450px] [&_p:not(.gym-kicker)]:mt-[18px] [&_p:not(.gym-kicker)]:text-base [&_p:not(.gym-kicker)]:leading-[1.55] [&_p:not(.gym-kicker)]:text-[#a9afa7]" aria-labelledby="member-title"><p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">{gym.location}</p><h1 id="member-title">Hola, {profile?.nombres || "usuario"}.</h1><p>Tu espacio personal para entrenar y cuidar tu alimentacion.</p>{subscription && <span className={`inline-block mt-[22px] px-2.5 py-1.5 border rounded text-xs font-bold ${subscription.active ? "border-[rgba(91,212,143,.45)] bg-[rgba(38,112,69,.18)] text-[#75dfa2]" : "border-[rgba(255,121,121,.42)] bg-[rgba(120,42,42,.18)] text-[#ff9898]"}`}>{subscription.active ? "Suscripcion activa" : "Suscripcion vencida"}</span>}</section>
    <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[18px]" aria-label="Contenido principal">
      {sections.map((section) => <article className={`relative min-h-[330px] flex flex-col justify-between overflow-hidden p-7 border border-[#41433f] rounded-lg bg-[#212320] after:content-[''] after:absolute after:top-0 after:right-0 after:w-[150px] after:h-[150px] after:rounded-[0_0_0_150px] after:opacity-[0.82] [&>*]:relative [&>*]:z-[1] [&_h2]:m-0 [&_h2]:text-[32px] [&_h2]:tracking-[-1px] ${section.className === "gym-section-nutrition" ? "after:bg-[#ea9e48]" : "after:bg-[#b56cff]"}`} key={section.title}>
        <span className="text-[#c8cbc5] text-xs font-extrabold tracking-widest">{section.marker}</span><div><p className="m-0 mb-2.5 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">{section.eyebrow}</p><h2>{section.title}</h2><p>{section.description}</p></div>
        {section.href ? <Link className="self-start inline-flex items-center gap-[18px] p-0 border-0 bg-transparent text-[#f2f4ef] text-sm font-extrabold cursor-pointer [&_span]:text-[#b56cff] [&_span]:text-xl [&_span]:transition [&:hover_span]:translate-x-[5px]" href={`${section.href}?gym=${encodeURIComponent(gymSlug)}`}>Ver apartado <span aria-hidden="true">&rarr;</span></Link> : <button className="self-start inline-flex items-center gap-[18px] p-0 border-0 bg-transparent text-[#f2f4ef] text-sm font-extrabold cursor-pointer [&_span]:text-[#b56cff] [&_span]:text-xl [&_span]:transition [&:hover_span]:translate-x-[5px]" type="button">Ver apartado <span aria-hidden="true">&rarr;</span></button>}
      </article>)}
    </section>
  </main>;
}

export default function DashboardPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]"><p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Cargando...</p></div>}><MemberDashboard /></Suspense>;
}
