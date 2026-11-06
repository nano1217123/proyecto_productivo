"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useTrainingSession } from "../hooks/useTrainingSession";

function nuevaFila() {
  return {
    id: crypto.randomUUID(),
    ejercicioId: "",
    repeticiones: "",
    pesoKg: "",
  };
}
function TrainingPageContent({ gym = "jj-poblado" }) {
  const { loading, logout } = useAuth();
  const {
    catalogo, cargandoCatalogo,
    fecha, setFecha,
    notas, setNotas,
    filas, guardando, error, exito,
    nombrePorId,
    actualizarFila, agregarFila, quitarFila,
    guardarEntrenamiento
  } = useTrainingSession();
  if (loading || cargandoCatalogo) {
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
          <span>Entrenamientos</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link className="text-[13px] text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard/entrenamientos/historial?gym=${encodeURIComponent(gym)}`}>
            Ver historial
          </Link>
          <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>&larr; Inicio</Link>
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">ENTRENAMIENTO</p>
        <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">Registrar entrenamiento</h1>
        <p className="mt-[15px] text-[15px] leading-[1.6] text-[#a9afa7] max-w-[510px]">Elige tus ejercicios, agrega las series que hiciste y guarda tu sesión de hoy.</p>
      </section>

      <section className="w-full max-w-[1060px] mx-auto pb-10">
        {error && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{error}</div>}
        {exito && <div className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px]">{exito}</div>}

        <form onSubmit={guardarEntrenamiento} className="p-[26px] border border-[#41433f] rounded-xl bg-[#212320]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[15px] mb-6">
            <label className="text-xs font-bold text-[#c0c7bd]">
              Fecha
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
              />
            </label>
            <label className="text-xs font-bold text-[#c0c7bd]">
              Notas (opcional)
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                maxLength={200}
                placeholder="Ej: Día de empuje, buena energía"
                className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
              />
            </label>
          </div>

          <div className="grid gap-3 mb-4">
            {filas.map((fila, idx) => (
              <div key={fila.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-3 items-end p-4 border border-[#30332f] rounded-lg bg-[#171817]">
                <label className="text-xs font-bold text-[#c0c7bd]">
                  Ejercicio
                  <select
                    value={fila.ejercicioId}
                    onChange={(e) => actualizarFila(fila.id, "ejercicioId", e.target.value)}
                    required
                    className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
                  >
                    <option value="">Selecciona un ejercicio</option>
                    {catalogo.map((grupo) => (
                      <optgroup key={grupo.slug} label={grupo.nombre}>
                        {grupo.ejercicios.map((ej) => (
                          <option key={ej.id} value={ej.id}>{ej.nombre}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-bold text-[#c0c7bd]">
                  Repeticiones
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={fila.repeticiones}
                    onChange={(e) => actualizarFila(fila.id, "repeticiones", e.target.value)}
                    required
                    className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
                  />
                </label>

                <label className="text-xs font-bold text-[#c0c7bd]">
                  Peso (kg)
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.5"
                    value={fila.pesoKg}
                    onChange={(e) => actualizarFila(fila.id, "pesoKg", e.target.value)}
                    className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => quitarFila(fila.id)}
                  disabled={filas.length === 1}
                  className="px-3 py-2.5 border border-[rgba(255,121,121,.4)] rounded-md text-[#ff7979] text-xs font-semibold cursor-pointer transition hover:bg-[#351b1b] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={agregarFila}
            className="mb-6 px-4 py-2.5 border border-[#41463f] rounded-lg bg-transparent text-[#f2f4ef] text-[13px] font-bold cursor-pointer transition hover:border-[#b56cff] hover:text-[#d7adff]"
          >
            + Agregar serie
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="w-full p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Guardar entrenamiento"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function TrainingPage({ gym = "jj-poblado" }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]"><p className="text-sm text-[#a9afa7]">Cargando...</p></div>}>
      <TrainingPageContent gym={gym} />
    </Suspense>
  );
}