"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { muscleGroups } from "../lib/muscleGroups";
import { ExerciseListSkeleton } from "@/src/components/ui/Skeleton";
import ModeBadge from "@/src/components/ui/ModeBadge";

export default function ExercisesPage({ gym = "jj-poblado" }) {
  const { profile, loading } = useAuth();
  const searchParams = useSearchParams();

  // Modo casa: si la URL trae ?modo=casa o si el usuario es particular,
  // sin importar cómo llegó a esta página. Así todos los enlaces de grupos
  // conservan el filtro de casa.
  const esParticular = profile?.tipo_usuario === "usuario_particular";
  const modoCasa = searchParams.get("modo") === "casa" || esParticular;
  const modoQuery = modoCasa ? "&modo=casa" : "";

  if (loading) return <ExerciseListSkeleton />;

  return <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">

    <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
      <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">
        {modoCasa ? "MODO AUTÓNOMO" : "ENTRENAMIENTO"}
      </p>
      <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05] text-[#f2f4ef]">
        {modoCasa ? "Ejercicios en Casa" : "Elige un grupo muscular"}
      </h1>
      <p className="max-w-[510px] mt-[15px] mb-0 text-[15px] leading-[1.6] text-[#a9afa7]">
        {modoCasa
          ? "Elige un grupo muscular para ver ejercicios que puedes hacer en casa, sin máquinas ni equipo de gimnasio."
          : "Selecciona una categoria para conocer ejercicios enfocados en esa zona."}
      </p>
      <ModeBadge casa={modoCasa} className="mt-[18px]" />
    </section>

    <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" aria-label={modoCasa ? "Grupos musculares para entrenar en casa" : "Grupos musculares"}>
      {muscleGroups.map((group, index) => (
        <Link
          className="relative min-h-[175px] flex flex-col justify-end p-5 overflow-hidden border border-[#41433f] rounded-lg bg-[#212320] text-[#f2f4ef] no-underline transition hover:border-[#b56cff] hover:bg-[#292b28] hover:-translate-y-[3px] [&>*]:relative [&>*]:z-[1] [&_span]:absolute [&_span]:top-[19px] [&_span]:left-5 [&_span]:text-[11px] [&_span]:font-extrabold [&_span]:tracking-widest [&_span]:text-[#b56cff] [&_h2]:m-0 [&_h2]:text-[23px] [&_h2]:tracking-[-.5px] [&_p]:m-[6px_0_0] [&_p]:text-xs [&_p]:text-[#a9afa7] [&_b]:absolute [&_b]:right-[18px] [&_b]:bottom-[18px] [&_b]:text-xl [&_b]:text-[#b56cff]"
          key={group.slug}
          href={`/dashboard/ejercicios/${group.slug}?gym=${encodeURIComponent(gym)}${modoQuery}`}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h2>{group.name}</h2>
          {/* El conteo estático corresponde al catálogo de gimnasio; en casa se consulta al abrir el grupo */}
          <p>{modoCasa ? "Variantes sin equipo" : `${group.exercises.length} ejercicios`}</p>

        </Link>
      ))}
    </section>
  </main>;
}
