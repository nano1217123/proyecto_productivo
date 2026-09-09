"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getRoutineDetail, deleteRoutine } from "../lib/routines";

export default function RoutineDetailPage({ gym = "jj-poblado", rutinaId }) {
  const { loading, logout } = useAuth();
  const router = useRouter();
  const [rutina, setRutina] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getRoutineDetail(rutinaId)
      .then(setRutina)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [rutinaId]);

  async function handleEliminar() {
    if (!window.confirm(`¿Eliminar la rutina "${rutina.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteRoutine(rutinaId);
      router.push(`/dashboard/rutinas?gym=${encodeURIComponent(gym)}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleIniciar() {
    const ids = rutina.ejercicios.map((e) => e.ejercicio_id).join(",");
    router.push(`/dashboard/entrenamientos?gym=${encodeURIComponent(gym)}&rutina=${ids}`);
  }

  if (loading || cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
        <p className="text-sm text-[#a9afa7]">Cargando...</p>
      </div>
    );
  }

  if (error || !rutina) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
        <p className="text-sm text-[#ff7979]">{error || "Rutina no encontrada."}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href={`/dashboard/rutinas?gym=${encodeURIComponent(gym)}`}>
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span>
          <span>Rutinas</span>
        </Link>
        <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>
          Cerrar sesion
        </button>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard/rutinas?gym=${encodeURIComponent(gym)}`}>&larr; Rutinas</Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">{rutina.dia_etiqueta || "RUTINA"}</p>
            <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">{rutina.nombre}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/rutinas/${rutinaId}/editar?gym=${encodeURIComponent(gym)}`}
              className="px-4 py-2.5 border border-[#41463f] rounded-lg bg-transparent text-[#f2f4ef] text-[13px] font-bold no-underline transition hover:border-[#b56cff] hover:text-[#d7adff]"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={handleEliminar}
              className="px-4 py-2.5 border border-[rgba(255,121,121,.4)] rounded-lg bg-transparent text-[#ff7979] text-[13px] font-bold cursor-pointer transition hover:bg-[#351b1b]"
            >
              Eliminar
            </button>
          </div>
        </div>
      </section>

      <section className="w-full max-w-[1060px] mx-auto pb-10">
        <div className="p-[26px] border border-[#41433f] rounded-xl bg-[#212320]">
          <div className="grid gap-2 mb-6">
            {rutina.ejercicios.map((ej, idx) => (
              <div key={ej.ejercicio_id} className="flex items-center justify-between p-3 border border-[#30332f] rounded-lg bg-[#171817]">
                <span className="text-[13.5px] text-[#f2f4ef]"><strong className="text-[#b56cff] mr-2">{idx + 1}.</strong>{ej.nombre}</span>
                <span className="text-[11.5px] text-[#a9afa7]">{ej.grupo_nombre}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleIniciar}
            className="w-full p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px"
          >
            Iniciar entrenamiento
          </button>
        </div>
      </section>
    </main>
  );
}