"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { routinesApi } from "../api/routinesApi";
import RoutineCard from "../components/RoutineCard";

export default function RoutineListPage({ gym = "jj-poblado" }) {
  const { loading, logout } = useAuth();
  const [rutinas, setRutinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  function cargarRutinas() {
    setCargando(true);
    routinesApi.getRoutines()
      .then(setRutinas)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargarRutinas();
  }, []);

  async function handleEliminar(id, nombre) {
    if (!window.confirm(`¿Eliminar la rutina "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await routinesApi.deleteRoutine(id);
      setRutinas((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
        <p className="text-sm text-[#a9afa7]">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span>
          <span>Rutinas</span>
        </Link>
        <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>
          Cerrar sesion
        </button>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px] flex items-end justify-between gap-8 flex-wrap">
        <div>
          <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>&larr; Inicio</Link>
          <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">ENTRENAMIENTO</p>
          <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">Tus rutinas</h1>
        </div>
        <Link
          href={`/dashboard/rutinas/nueva?gym=${encodeURIComponent(gym)}`}
          className="px-5 py-3 bg-[#b56cff] text-[#10110f] border-0 rounded-lg font-bold text-[13px] cursor-pointer whitespace-nowrap transition hover:bg-[#d7adff] hover:-translate-y-px no-underline"
        >
          + Nueva rutina
        </Link>
      </section>

      {error && <div className="w-full max-w-[1060px] mx-auto mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{error}</div>}

      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[18px] pb-10">
        {rutinas.length === 0 && (
          <p className="p-5 border border-[#41433f] rounded-xl bg-[#212320] text-sm text-[#a9afa7]">
            Todavía no tienes rutinas. Crea la primera con el botón de arriba.
          </p>
        )}
        {rutinas.map((rutina) => (
          <RoutineCard key={rutina.id} rutina={rutina} gym={gym} onEliminar={handleEliminar} />
        ))}
      </section>
    </main>
  );
}