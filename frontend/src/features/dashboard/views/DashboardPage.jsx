"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import { MemberDashboardSkeleton } from "@/src/components/ui/Skeleton";
import ModeBadge from "@/src/components/ui/ModeBadge";
import DailyTrackerWidget from "@/src/features/particular/components/DailyTrackerWidget";
import SubscriptionCard from "@/src/features/payments/components/SubscriptionCard";

function MemberDashboard() {
  const { profile, loading, logout } = useAuth();
  const { sede: datosSede } = useSedes();

  // La sede del cliente es la registrada en el servidor (miembros_sede),
  // nunca un parámetro de la URL.
  const esCliente = profile?.tipo_usuario === "cliente";
  const sede = esCliente && profile?.sede ? datosSede(profile.sede) : null;
  const clienteSinSede = esCliente && !profile?.sede;
  const marca = sede?.nombre ?? "JJ GYM";
  const ubicacion = sede?.ubicacion ?? (clienteSinSede ? "Sin sede asignada" : "Entrenamiento en casa");

  // Solo el usuario particular (registro web) ve el tracker y "Ejercicios en Casa".
  // "cliente" (alumno de gimnasio), "admin" y "super_admin" ven las tarjetas normales.
  const esParticular = profile?.tipo_usuario === "usuario_particular";

  // Las secciones viven dentro del componente porque dependen de 'esParticular'
  const sections = [
    {
      title: esParticular ? "Ejercicios en Casa" : "Ejercicios",
      eyebrow: esParticular ? "Entrenamiento Libre" : "Entrenamiento",
      description: esParticular 
        ? "Ejercicios funcionales que puedes hacer en casa sin necesidad de máquinas ni pesas."
        : "Encuentra rutinas para fuerza, movilidad y rendimiento, organizadas para avanzar a tu ritmo.",
      marker: "01",
      href: esParticular ? "/dashboard/ejercicios?modo=casa" : "/dashboard/ejercicios",
    },
    {
      title: "Mis rutinas",
      eyebrow: "Planificación",
      description: "Crea y gestiona tus rutinas de entrenamiento personalizadas.",
      marker: "02",
      href: "/dashboard/rutinas",
    },
    {
      title: "Nutricion",
      eyebrow: "Bienestar",
      description: "Consulta recomendaciones para acompanar tu entrenamiento y construir habitos sostenibles.",
      marker: "03",
      href: "/dashboard/nutricion",
    },
  ];

  if (loading) return <MemberDashboardSkeleton />;

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link
          className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline"
          href="/"
          aria-label="Volver al inicio"
        >
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">
            GYM
          </span>
          <span>{marca}</span>
        </Link>
        <button
          className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]"
          type="button"
          onClick={logout}
        >
          Cerrar sesion
        </button>
      </header>

      <section
        className="w-full max-w-[1060px] mx-auto pt-[78px] pb-[32px] [&_h1]:m-0 [&_h1]:text-[clamp(36px,6vw,62px)] [&_h1]:tracking-[-2px] [&_h1]:leading-none [&_p:not(.gym-kicker)]:max-w-[450px] [&_p:not(.gym-kicker)]:mt-[18px] [&_p:not(.gym-kicker)]:text-base [&_p:not(.gym-kicker)]:leading-[1.55] [&_p:not(.gym-kicker)]:text-[#a9afa7]"
        aria-labelledby="member-title"
      >
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">
          {ubicacion}
        </p>
        <h1 id="member-title" className="text-[#f2f4ef]">
          Hola, {profile?.nombres || "usuario"}.
        </h1>
        <p>
          {esParticular
            ? "Explora rutinas y ejercicios diseñados para entrenar en casa sin equipamiento de gimnasio."
            : "Tu espacio personal para entrenar y cuidar tu alimentacion."}
        </p>
        <div className="flex flex-wrap items-center gap-2.5 mt-[22px]">
          <ModeBadge casa={esParticular} />
        </div>
      </section>

      {/* El estado de la suscripción no se calcula desde la fecha de registro:
          el backend aún no registra su vigencia. */}
      {esParticular && (
        <section className="w-full max-w-[1060px] mx-auto mb-[28px]">
          <SubscriptionCard />
        </section>
      )}

      {clienteSinSede && (
        <p
          role="status"
          className="w-full max-w-[1060px] mx-auto mb-[28px] p-4 rounded-md border border-[rgba(255,196,87,.45)] bg-[rgba(120,86,20,.2)] text-[#ffcf70] text-sm"
        >
          Tu cuenta de cliente aún no tiene una sede asignada. Pídele a tu
          gimnasio que te vincule para ver su información y publicar reseñas.
        </p>
      )}

      {esParticular && (
        <section
          className="w-full max-w-[1060px] mx-auto mb-[38px]"
          aria-label="Panel de hábitos diarios"
        >
          <DailyTrackerWidget />
        </section>
      )}

      <section
        className="w-full max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-[18px]"
        aria-label="Contenido principal"
      >
        {sections.map((section) => (
          <article
            className={`relative min-h-[330px] flex flex-col justify-between overflow-hidden p-7 border border-[#41433f] rounded-lg bg-[#212320] after:content-[''] after:absolute after:top-0 after:right-0 after:w-[150px] after:h-[150px] after:rounded-[0_0_0_150px] after:opacity-[0.82] [&>*]:relative [&>*]:z-[1] [&_h2]:m-0 [&_h2]:text-[32px] [&_h2]:tracking-[-1px] [&_h2]:text-[#f2f4ef] [&_p:last-child]:text-[#a9afa7] after:bg-[#b56cff]`}
            key={section.title}
          >
            <span className="text-[#c8cbc5] text-xs font-extrabold tracking-widest">
              {section.marker}
            </span>
            <div>
              <p className="m-0 mb-2.5 text-[11px] font-extrabold tracking-[1.8px] uppercase text-[#b56cff]">
                {section.eyebrow}
              </p>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>

            <Link
              className="self-start inline-flex items-center gap-[18px] p-0 border-0 bg-transparent text-[#f2f4ef] text-sm font-extrabold cursor-pointer [&_span]:text-[#b56cff] [&_span]:text-xl [&_span]:transition [&:hover_span]:translate-x-[5px]"
              href={section.href}
            >
              Ver apartado <span aria-hidden="true">&rarr;</span>
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<MemberDashboardSkeleton />}>
      <MemberDashboard />
    </Suspense>
  );
}