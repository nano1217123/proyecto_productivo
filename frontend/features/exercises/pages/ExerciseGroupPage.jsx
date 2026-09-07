"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { muscleGroupBySlug } from "../lib/muscleGroups";
import { getExerciseAnatomy } from "../lib/muscleMap";
import { slugify } from "../lib/slugify";
import BodyMuscleDiagram from "../components/BodyMuscleDiagram";
import { ExerciseGroupSkeleton } from "@/components/ui/Skeleton";

export default function ExerciseGroupPage({ groupSlug, gym = "jj-poblado" }) {
  const { loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const group = muscleGroupBySlug[groupSlug];
  const [selected, setSelected] = useState(null);
  const [restoredFromUrl, setRestoredFromUrl] = useState(false);

  useEffect(() => {
    if (!loading && !group) router.replace(`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`);
  }, [loading, group, gym, router]);

  useEffect(() => {
    if (!group || restoredFromUrl) return;
    const slug = searchParams.get("ejercicio");
    if (slug) {
      const match = group.exercises.find((exercise) => slugify(exercise.name) === slug);
      if (match) setSelected(match);
    }
    setRestoredFromUrl(true);
  }, [group, restoredFromUrl, searchParams]);

  useEffect(() => {
    function handleKeyDown(event) { if (event.key === "Escape") closeModal(); }
    if (selected) { document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function syncUrl(exerciseOrNull) {
    const params = new URLSearchParams(searchParams.toString());
    if (exerciseOrNull) params.set("ejercicio", slugify(exerciseOrNull.name));
    else params.delete("ejercicio");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  function openExercise(exercise) { setSelected(exercise); syncUrl(exercise); }
  function closeModal() { setSelected(null); syncUrl(null); }

  if (loading || !group) return <ExerciseGroupSkeleton />;

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span><span>Ejercicios</span>
        </Link>
        <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`}>&larr; Grupos musculares</Link>
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">{group.name.toUpperCase()}</p>
        <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">Ejercicios de {group.name.toLowerCase()}</h1>
        <p className="max-w-[510px] mt-[15px] text-[15px] leading-[1.6] text-[#a9afa7]">Toca cualquier ejercicio para ver como hacerlo, el musculo principal que trabaja y un consejo clave.</p>
      </section>

      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" aria-label={`Ejercicios de ${group.name}`}>
        {group.exercises.map((exercise, index) => (
          <button
            className="group relative min-h-[150px] flex flex-col items-start gap-1.5 p-5 border border-[#41433f] rounded-lg bg-[#212320] text-left text-[#f2f4ef] cursor-pointer transition hover:border-[var(--accent)] hover:bg-[#292b28] hover:-translate-y-1"
            key={exercise.name}
            type="button"
            style={{ "--accent": group.accent }}
            onClick={() => openExercise(exercise)}
          >
            <span className="text-[11px] font-extrabold tracking-widest text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="m-0 text-[17px]">{exercise.name}</h2>
            <p className="m-0 text-[12.5px] text-[#a9afa7]">{exercise.primary}</p>
            <span className="mt-auto pt-2.5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[var(--accent)]">Ver detalle <b aria-hidden="true">&rarr;</b></span>
          </button>
        ))}
      </section>

      {selected && (() => {
        const anatomy = getExerciseAnatomy(selected, groupSlug, group.name);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[rgba(8,9,7,0.72)] backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={selected.name} onClick={closeModal}>
            <div className="relative w-full max-w-[480px] max-h-[88vh] overflow-y-auto p-[30px_28px] border border-[#41433f] rounded-2xl bg-[#1c1e1b]" onClick={(event) => event.stopPropagation()}>
              <button className="absolute top-4 right-4 w-8 h-8 border border-[#41433f] rounded-full bg-[#262822] text-[#f2f4ef] text-lg leading-none cursor-pointer hover:border-[#b56cff] hover:text-[#b56cff]" type="button" onClick={closeModal} aria-label="Cerrar">&times;</button>

              <div className="mb-[18px]">
                <BodyMuscleDiagram primaryMuscles={anatomy.primaryIds} secondaryMuscles={anatomy.secondaryIds} accent={group.accent} />
              </div>

              <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px]" style={{ color: group.accent }}>{group.name.toUpperCase()}</p>
              <h2 className="m-[4px_0_14px] text-[25px] tracking-[-.6px]">{selected.name}</h2>

              <dl className="grid grid-cols-2 gap-3 m-0 mb-4 p-[14px] rounded-[10px] bg-[#151714]">
                <div><dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">Grupo</dt><dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{anatomy.grupo}</dd></div>
                <div><dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">Musculo principal</dt><dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{anatomy.principal.map((m) => m.label).join(", ")}</dd></div>
                <div className="col-span-2"><dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">Zona</dt><dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{anatomy.principal.map((m) => m.zone).join(" · ")}</dd></div>
                {anatomy.secundarios.length > 0 && (
                  <div className="col-span-2"><dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">Secundarios</dt><dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{anatomy.secundarios.map((m) => m.label).join(", ")}</dd></div>
                )}
                <div><dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">Vista</dt><dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{anatomy.vista}</dd></div>
                <div><dt className="m-0 mb-[3px] text-[10.5px] font-extrabold tracking-wider uppercase text-[#a9afa7]">Equipo</dt><dd className="m-0 text-[13px] font-semibold text-[#f2f4ef]">{selected.equipment}</dd></div>
              </dl>

              <p className="m-0 mb-[14px] text-sm leading-[1.6] text-[#c7ccc2]">{selected.description}</p>
              <p className="m-0 p-[12px_14px] border-l-[3px] border-[#b56cff] rounded bg-[#321d47] text-[#ddd7f5] text-[13px] leading-[1.55]"><strong>Consejo:</strong> {selected.tip}</p>
            </div>
          </div>
        );
      })()}
    </main>
  );
}