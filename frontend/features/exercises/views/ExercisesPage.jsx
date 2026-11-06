"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { muscleGroups } from "../lib/muscleGroups";

export default function ExercisesPage({ gym = "jj-poblado" }) {
 const { loading, logout } = useAuth();
if (loading) return <ExerciseListSkeleton />;

  return <main className="min-h-screen px-6 pb-[72px] bg-[#171817] pb-20">
    <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]"><Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href={`/dashboard?gym=${encodeURIComponent(gym)}`}><span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span><span>Ejercicios</span></Link><button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>Cerrar sesion</button></header>
    <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px] [&_h1]:m-0 [&_h1]:text-[clamp(34px,5vw,54px)] [&_h1]:tracking-[-1.8px] [&_h1]:leading-[1.05] [&_p:last-child]:max-w-[510px] [&_p:last-child]:mt-[15px] [&_p:last-child]:text-[15px] [&_p:last-child]:leading-[1.6] [&_p:last-child]:text-[#a9afa7]"><Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>&larr; Inicio</Link><p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">ENTRENAMIENTO</p><h1>Elige un grupo muscular</h1><p>Selecciona una categoria para conocer ejercicios enfocados en esa zona.</p></section>
    <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" aria-label="Grupos musculares">
      {muscleGroups.map((group, index) => <Link className="relative min-h-[175px] flex flex-col justify-end p-5 overflow-hidden border border-[#41433f] rounded-lg bg-[#212320] text-[#f2f4ef] no-underline transition hover:border-[#b56cff] hover:bg-[#292b28] hover:-translate-y-[3px] [&>*]:relative [&>*]:z-[1] [&_span]:absolute [&_span]:top-[19px] [&_span]:left-5 [&_span]:text-[11px] [&_span]:font-extrabold [&_span]:tracking-widest [&_span]:text-[#b56cff] [&_h2]:m-0 [&_h2]:text-[23px] [&_h2]:tracking-[-.5px] [&_p]:m-[6px_0_0] [&_p]:text-xs [&_p]:text-[#a9afa7] [&_b]:absolute [&_b]:right-[18px] [&_b]:bottom-[18px] [&_b]:text-xl [&_b]:text-[#b56cff]" key={group.slug} href={`/dashboard/ejercicios/${group.slug}?gym=${encodeURIComponent(gym)}`}><span>{String(index + 1).padStart(2, "0")}</span><h2>{group.name}</h2><p>{group.exercises.length} ejercicios</p><b aria-hidden="true">&rarr;</b></Link>)}
    </section>
  </main>;
}
