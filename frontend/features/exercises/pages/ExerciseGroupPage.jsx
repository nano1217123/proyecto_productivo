"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { muscleGroupBySlug } from "../lib/muscleGroups";

// Silueta simple e ilustrativa (dibujada a mano, sin fotos externas) que
// resalta en color la zona muscular correspondiente al grupo seleccionado.
const HIGHLIGHT_REGIONS = {
  pecho: { cx: 50, cy: 34, rx: 19, ry: 10 },
  espalda: { cx: 50, cy: 36, rx: 20, ry: 16 },
  hombros: { cx: 50, cy: 26, rx: 26, ry: 7 },
  brazos: { cx: 50, cy: 42, rx: 30, ry: 8 },
  biceps: { cx: 50, cy: 40, rx: 28, ry: 6 },
  triceps: { cx: 50, cy: 44, rx: 28, ry: 6 },
  piernas: { cx: 50, cy: 72, rx: 15, ry: 24 },
  muslos: { cx: 50, cy: 64, rx: 16, ry: 14 },
  gluteos: { cx: 50, cy: 54, rx: 17, ry: 8 },
  pantorrillas: { cx: 50, cy: 86, rx: 12, ry: 10 },
  abdominales: { cx: 50, cy: 46, rx: 12, ry: 12 },
  cintura: { cx: 50, cy: 46, rx: 18, ry: 10 },
  "espalda-baja": { cx: 50, cy: 50, rx: 16, ry: 8 },
};

function MuscleSilhouette({ slug, accent }) {
  const region = HIGHLIGHT_REGIONS[slug] || HIGHLIGHT_REGIONS.pecho;
  return (
    <svg viewBox="0 0 100 130" className="block w-full max-w-[150px] h-auto mx-auto mb-[18px]" role="img" aria-label={`Zona muscular trabajada: ${slug}`}>
      <ellipse cx="50" cy="12" rx="9" ry="10" fill="#3a3d38" />
      <path d="M35 22 Q50 18 65 22 L70 62 Q65 70 50 70 Q35 70 30 62 Z" fill="#3a3d38" />
      <path d="M30 26 L16 55 L23 58 L35 34 Z" fill="#33362f" />
      <path d="M70 26 L84 55 L77 58 L65 34 Z" fill="#33362f" />
      <path d="M38 68 L33 122 L43 122 L48 74 Z" fill="#33362f" />
      <path d="M62 68 L67 122 L57 122 L52 74 Z" fill="#33362f" />
      <ellipse cx={region.cx} cy={region.cy} rx={region.rx} ry={region.ry} fill={accent} opacity="0.85" />
    </svg>
  );
}

export default function ExerciseGroupPage({ groupSlug, gym = "jj-poblado" }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const group = muscleGroupBySlug[groupSlug];
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (!loading && user && !group) router.replace(`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`); }, [loading, user, group, gym, router]);

  useEffect(() => {
    function handleKeyDown(event) { if (event.key === "Escape") setSelected(null); }
    if (selected) { document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }
  }, [selected]);

  if (loading || !user || !group) return <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]"><p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Cargando...</p></div>;

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817] pb-20">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href={`/dashboard?gym=${encodeURIComponent(gym)}`}><span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span><span>Ejercicios</span></Link>
        <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>Cerrar sesion</button>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px] [&_h1]:m-0 [&_h1]:text-[clamp(34px,5vw,54px)] [&_h1]:tracking-[-1.8px] [&_h1]:leading-[1.05] [&_p:last-child]:max-w-[510px] [&_p:last-child]:mt-[15px] [&_p:last-child]:text-[15px] [&_p:last-child]:leading-[1.6] [&_p:last-child]:text-[#a9afa7]">
        <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard/ejercicios?gym=${encodeURIComponent(gym)}`}>&larr; Grupos musculares</Link>
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">{group.name.toUpperCase()}</p>
        <h1>Ejercicios de {group.name.toLowerCase()}</h1>
        <p>Toca cualquier ejercicio para ver como hacerlo, el musculo principal que trabaja y un consejo clave.</p>
      </section>

      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" aria-label={`Ejercicios de ${group.name}`}>
        {group.exercises.map((exercise, index) => (
          <button
            className="group relative min-h-[150px] flex flex-col items-start gap-1.5 p-5 border border-[#41433f] rounded-lg bg-[#212320] text-left font-inherit text-[#f2f4ef] cursor-pointer transition hover:border-[var(--accent)] hover:bg-[#292b28] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(0,0,0,.35),0_0_0_1px_var(--accent)_inset] focus:outline-none"
            key={exercise.name}
            type="button"
            style={{ "--accent": group.accent }}
            onClick={() => setSelected(exercise)}
          >
            <span className="text-[11px] font-extrabold tracking-widest text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</span>
            <h2>{exercise.name}</h2>
            <p className="m-0 text-[12.5px] text-[#a9afa7]">{exercise.primary}</p>
            <span className="mt-auto pt-2.5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[var(--accent)] [&_b]:transition [&_b]:duration-150 group-hover:[&_b]:translate-x-1">Ver detalle <b aria-hidden="true">&rarr;</b></span>
          </button>
        ))}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[rgba(8,9,7,0.72)] backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={selected.name} onClick={() => setSelected(null)}>
          <div className="relative w-full max-w-[480px] max-h-[88vh] overflow-y-auto p-[30px_28px] border border-[#41433f] rounded-2xl bg-[#1c1e1b] shadow-[0_26px_60px_rgba(0,0,0,0.5)]" onClick={(event) => event.stopPropagation()}>
            <button className="absolute top-4 right-4 w-8 h-8 border border-[#41433f] rounded-full bg-[#262822] text-[#f2f4ef] text-lg leading-none cursor-pointer hover:border-[#b56cff] hover:text-[#b56cff]" type="button" onClick={() => setSelected(null)} aria-label="Cerrar">&times;</button>
            <MuscleSilhouette slug={group.slug} accent={group.accent} />
            <div className="[&_h2]:m-[4px_0_14px] [&_h2]:text-[25px] [&_h2]:tracking-[-.6px]">
              <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]" style={{ color: group.accent }}>{group.name.toUpperCase()}</p>
              <h2>{selected.name}</h2>
              <dl className="grid grid-cols-2 gap-3 m-0 mb-4 p-[14px] rounded-[10px] bg-[#151714] [&_dt]:m-0 [&_dt]:mb-[3px] [&_dt]:text-[10.5px] [&_dt]:font-extrabold [&_dt]:tracking-wider [&_dt]:uppercase [&_dt]:text-[#a9afa7] [&_dd]:m-0 [&_dd]:text-[13px] [&_dd]:font-semibold [&_dd]:text-[#f2f4ef]">
                <div><dt>Musculo principal</dt><dd>{selected.primary}</dd></div>
                <div><dt>Equipo</dt><dd>{selected.equipment}</dd></div>
              </dl>
              <p className="m-0 mb-[14px] text-sm leading-[1.6] text-[#c7ccc2]">{selected.description}</p>
              <p className="m-0 p-[12px_14px] border-l-[3px] border-[#b56cff] rounded bg-[#321d47] text-[#ddd7f5] text-[13px] leading-[1.55]"><strong>Consejo:</strong> {selected.tip}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
