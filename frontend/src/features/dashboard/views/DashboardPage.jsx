"use client";

import Link from "next/link";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import DailyTrackerWidget from "@/src/features/particular/components/DailyTrackerWidget";
import SubscriptionCard from "@/src/features/payments/components/SubscriptionCard";

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";
const accion = `inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-center text-sm font-bold no-underline ${foco}`;

export default function DashboardPage() {
  const { profile, logout } = useAuth();
  const { sede: datosSede } = useSedes();
  const esCliente = profile?.tipo_usuario === "cliente";
  const esParticular = profile?.tipo_usuario === "usuario_particular";
  const slugSede = esCliente ? profile.sede : null;
  const sede = slugSede ? datosSede(slugSede) : null;
  const marca = sede?.nombre ?? "JJ GYM";
  const contexto = esParticular ? "Entrenamiento en casa" : sede?.ubicacion;
  const gymQuery = slugSede ? `?gym=${encodeURIComponent(slugSede)}` : "";

  const secciones = [
    {
      titulo: esParticular ? "Ejercicios en casa" : "Ejercicios",
      descripcion: esParticular ? "Explora ejercicios sin máquinas ni pesas." : "Encuentra ejercicios por grupo muscular.",
      href: esParticular ? "/dashboard/ejercicios?modo=casa" : "/dashboard/ejercicios",
    },
    {
      titulo: "Nutrición",
      descripcion: "Consulta recomendaciones para acompañar tu entrenamiento.",
      href: "/dashboard/nutricion",
    },
    {
      titulo: "Centro de reportes",
      descripcion: "Consulta y descarga tus reportes.",
      href: "/dashboard/reportes",
    },
  ];

  return (
    <main className="min-h-screen bg-[#171817] px-4 pb-16 text-[#f2f4ef] sm:px-6">
      <div className="mx-auto max-w-[1060px]">
        <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#30332f] py-2">
          <Link href="/" className={`inline-flex min-h-11 items-center rounded-sm text-base font-extrabold no-underline hover:text-[#d7adff] ${foco}`}>
            {marca}
          </Link>
          <button type="button" onClick={logout} className={`min-h-11 cursor-pointer rounded-sm text-sm font-semibold text-[#a9afa7] hover:text-[#f2f4ef] ${foco}`}>
            Cerrar sesión
          </button>
        </header>

        <section aria-labelledby="member-title" className="py-7 sm:py-10">
          {contexto && <p className="mb-2 text-sm font-semibold text-[#d7adff]">{contexto}</p>}
          <h1 id="member-title" className="break-words text-[clamp(32px,6vw,52px)] font-extrabold leading-tight tracking-tight">
            Hola, {profile?.nombres || "usuario"}.
          </h1>
          <nav aria-label="Acciones de entrenamiento" className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
            <Link href={`/dashboard/entrenamientos${gymQuery}`} className={`${accion} bg-[#b56cff] text-[#10110f] hover:bg-[#d7adff]`}>
              Registrar entrenamiento
            </Link>
            <Link href={`/dashboard/rutinas${gymQuery}`} className={`${accion} border border-[#41463f] bg-[#212320] hover:border-[#b56cff]`}>
              Mis rutinas
            </Link>
            <Link href={`/dashboard/entrenamientos/historial${gymQuery}`} className={`${accion} border border-[#41463f] bg-[#212320] hover:border-[#b56cff]`}>
              Ver historial
            </Link>
          </nav>
        </section>

        {esCliente && !slugSede && (
          <p role="status" className="mb-6 rounded-lg border border-[rgba(255,196,87,.45)] bg-[rgba(120,86,20,.2)] p-4 text-sm text-[#ffcf70]">
            Tu cuenta aún no tiene una sede asignada. Pídele a tu gimnasio que te vincule para ver su información y publicar reseñas.
          </p>
        )}

        <nav aria-labelledby="otras-herramientas" className="mb-6">
          <h2 id="otras-herramientas" className="mb-3 text-lg font-bold">Herramientas</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {secciones.map(({ titulo, descripcion, href }) => (
              <li key={href}>
                <Link href={href} className={`block h-full rounded-xl border border-[#41433f] bg-[#212320] p-4 no-underline hover:border-[#b56cff] ${foco}`}>
                  <p className="font-bold text-[#f2f4ef]">{titulo}</p>
                  <p className="mt-1 text-sm text-[#a9afa7]">{descripcion}</p>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {esParticular && (
          <div className="grid gap-4">
            <DailyTrackerWidget mostrarEntrenamiento={false} />
            <SubscriptionCard />
          </div>
        )}
      </div>
    </main>
  );
}
