"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useTrainingSession } from "../hooks/useTrainingSession";
import SetRow from "../components/SetRow";
import TrainingExercisePicker from "../components/TrainingExercisePicker";

const ESTILO_FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";

function TrainingPageContent({ gym = "jj-poblado" }) {
  const { loading } = useAuth();
  const {
    catalogo, cargandoCatalogo, errorCatalogo, cargarCatalogo,
    fecha, setFecha,
    notas, setNotas,
    filas, guardando, error, exito,
    actualizarFila, agregarFila, quitarFila,
    guardarEntrenamiento
  } = useTrainingSession();
  const catalogoDisponible = !errorCatalogo && !cargandoCatalogo;
  // Tras un reintento exitoso el botón desaparece: lleva el foco al primer
  // campo del formulario para no dejarlo en <body>.
  const reintentoRef = useRef(false);
  const fechaRef = useRef(null);
  const repeticionesRef = useRef(null);
  const [filaConFoco, setFilaConFoco] = useState(null);

  useEffect(() => {
    if (filaConFoco) repeticionesRef.current?.focus();
  }, [filaConFoco]);

  function agregarYEnfocar(ejercicioId) {
    setFilaConFoco(agregarFila(ejercicioId));
  }

  useEffect(() => {
    if (!catalogoDisponible || !reintentoRef.current) return;
    reintentoRef.current = false;
    fechaRef.current?.focus();
  }, [catalogoDisponible]);

  function reintentarCatalogo() {
    reintentoRef.current = true;
    cargarCatalogo();
  }

  if (loading || (cargandoCatalogo && !errorCatalogo && catalogo.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
        <p className="text-sm text-[#a9afa7]">Cargando...</p>
      </div>
    );
  }

  const nombresPorId = new Map(catalogo.flatMap((grupo) =>
    grupo.ejercicios.map((ejercicio) => [String(ejercicio.id), ejercicio.nombre]),
  ));
  const filasPorEjercicio = new Map();
  for (const fila of filas) {
    if (!filasPorEjercicio.has(fila.ejercicioId)) filasPorEjercicio.set(fila.ejercicioId, []);
    filasPorEjercicio.get(fila.ejercicioId).push(fila);
  }

  return (
    <main className="min-h-screen px-4 pb-[72px] sm:px-6 bg-[#171817]">

      <section className="w-full max-w-[1060px] mx-auto pt-8 pb-6">
        <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">Registrar entrenamiento</h1>
      </section>

      <section className="w-full max-w-[1060px] mx-auto pb-10">
        {errorCatalogo && (
          <div className="p-[26px] border border-[rgba(255,121,121,0.32)] rounded-xl bg-[#212320]">
            <p role="alert" className="m-0 mb-2 text-sm font-bold text-[#ff7979]">{errorCatalogo}</p>
            <p className="m-0 mb-5 text-[13px] text-[#a9afa7]">
              Sin el catálogo no puedes elegir ejercicios. Tu fecha, notas y series se conservan mientras reintentas.
            </p>
            <button
              type="button"
              onClick={reintentarCatalogo}
              aria-disabled={cargandoCatalogo}
              className={`px-4 py-2.5 border-0 rounded-lg bg-[#b56cff] text-[#10110f] text-[13px] font-extrabold cursor-pointer transition hover:bg-[#d7adff] aria-disabled:opacity-60 aria-disabled:cursor-wait ${ESTILO_FOCO}`}
            >
              {cargandoCatalogo ? "Cargando catálogo..." : "Reintentar carga del catálogo"}
            </button>
          </div>
        )}

        {catalogoDisponible && (
          <form onSubmit={guardarEntrenamiento} className="rounded-xl border border-[#41433f] bg-[#212320] p-4 sm:p-6">
            <fieldset disabled={guardando} className="min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[15px] mb-6">
                <label className="text-xs font-bold text-[#c0c7bd]">
                  Fecha
                  <input
                    ref={fechaRef}
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm focus-visible:outline-2 focus-visible:outline-[#b56cff]"
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
                    className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm focus-visible:outline-2 focus-visible:outline-[#b56cff]"
                  />
                </label>
              </div>

              <TrainingExercisePicker catalogo={catalogo} onAdd={agregarYEnfocar} />

              <section aria-labelledby="series-entrenamiento" className="mb-6 grid gap-3">
                <h2 id="series-entrenamiento" className="text-base font-bold text-[#f2f4ef]">Series del entrenamiento ({filas.length})</h2>
                {filas.length === 0 && <p className="text-sm text-[#a9afa7]">Agrega un ejercicio para registrar tu primera serie.</p>}
                {Array.from(filasPorEjercicio, ([ejercicioId, series]) => {
                  const nombre = nombresPorId.get(ejercicioId);
                  const titulo = nombre ?? `Ejercicio no disponible (${ejercicioId})`;
                  return (
                    <fieldset key={ejercicioId} className="grid min-w-0 gap-2 rounded-lg border border-[#41463f] p-3">
                      <legend className="px-1 text-sm font-bold text-[#f2f4ef]">{titulo}</legend>
                      {series.map((fila, index) => (
                        <SetRow key={fila.id} fila={fila} numero={index + 1} ejercicio={titulo}
                          repeticionesRef={fila.id === filaConFoco ? repeticionesRef : null}
                          onUpdate={actualizarFila} onRemove={quitarFila} />
                      ))}
                      {nombre && (
                        <button type="button" onClick={() => agregarYEnfocar(ejercicioId)}
                          aria-label={`Agregar serie de ${nombre}`}
                          className={`min-h-10 justify-self-start rounded-lg border border-[#41463f] px-3 py-2 text-sm font-bold text-[#f2f4ef] hover:border-[#b56cff] ${ESTILO_FOCO}`}>
                          Agregar serie
                        </button>
                      )}
                    </fieldset>
                  );
                })}
              </section>

            </fieldset>

            {error && <p role="alert" className="mb-4 rounded-lg border border-[rgba(255,121,121,0.32)] bg-[#351b1b] p-3 text-sm text-[#ff7979]">{error}</p>}
            {exito && <p role="status" className="mb-4 rounded-lg border border-[rgba(181,108,255,0.32)] bg-[#321d47] p-3 text-sm text-[#d7adff]">{exito}</p>}
            <button
              type="submit"
              disabled={guardando}
              className="w-full p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {guardando ? "Guardando..." : "Guardar entrenamiento"}
            </button>
          </form>
        )}
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