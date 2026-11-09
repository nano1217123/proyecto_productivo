"use client";

import Link from "next/link";

export default function RoutineCard({ rutina, gym, onEliminar }) {
  return (
    <article className="p-5 border border-[#41433f] rounded-xl bg-[#212320] flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="m-0 text-lg">{rutina.nombre}</h2>
          {rutina.dia_etiqueta && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-[rgba(181,108,255,.3)] bg-[rgba(181,108,255,.15)] text-[#d7adff] whitespace-nowrap">
              {rutina.dia_etiqueta}
            </span>
          )}
        </div>
        <p className="m-0 text-[13px] text-[#a9afa7]">{rutina.total_ejercicios} ejercicio{rutina.total_ejercicios !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#30332f]">
        <Link href={`/dashboard/rutinas/${rutina.id}?gym=${encodeURIComponent(gym)}`} className="text-[13px] font-extrabold text-[#f2f4ef] no-underline hover:text-[#d7adff]">
          Ver rutina →
        </Link>
        <button type="button" onClick={() => onEliminar(rutina.id, rutina.nombre)} className="px-3 py-1.5 bg-transparent border border-[rgba(255,121,121,.4)] rounded-md text-[#ff7979] text-xs font-semibold cursor-pointer transition hover:bg-[#351b1b]">
          Eliminar
        </button>
      </div>
    </article>
  );
}
