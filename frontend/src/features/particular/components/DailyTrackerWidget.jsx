"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDailyMetrics } from "../hooks/useDailyMetrics.js";
import DailyMetricsConflict from "./DailyMetricsConflict.jsx";

const ESTILO_FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";

// El modo anterior puede guardar varias filas por día: los textos hablan de
// "peso guardado", sin afirmar que sea el peso de hoy.
function textoMensaje(mensaje, errorCarga) {
  if (mensaje.tipo === "exito") return "Peso guardado.";
  if (errorCarga) return "No se pudo cargar tu progreso.";
  return mensaje.texto;
}

// Solo edita el peso. El hook conserva los demás valores cargados
// (vasosAgua, entrenamientoCompletado) y decide el cuerpo según el modo.
export default function DailyTrackerWidget() {
  const tituloRef = useRef(null);
  const tituloId = useId();
  const pesoId = useId();
  const ayudaPesoId = useId();
  const { habits, diaLocal, pesoRegistrado, cargando, errorCarga, guardando, mensaje, controlesBloqueados, puedeGuardar,
    editar, recargar, guardarCambios, conflicto, consultarNuevoDia, resolverConflicto } = useDailyMetrics();
  const [avisoOculto, setAvisoOculto] = useState(null);
  const avisoVisible = mensaje === avisoOculto ? null : mensaje;

  useEffect(() => {
    if (mensaje?.tipo !== "exito") return;

    const temporizador = setTimeout(() => setAvisoOculto(mensaje), 4000);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  function enviarPeso(evento) {
    evento.preventDefault();
    guardarCambios();
  }

  return (
    <article
      className="relative overflow-hidden p-6 md:p-7 border border-[#41433f] rounded-2xl bg-[#212320] text-[#f2f4ef] shadow-xl"
      aria-labelledby={tituloId}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#b56cff] opacity-10 blur-3xl"
        aria-hidden="true"
      />

      <header className="mb-6 pb-4 border-b border-[#30332f]">
        <span className="inline-block text-[11px] font-extrabold tracking-[2px] uppercase text-[#b56cff] mb-1">
          SEGUIMIENTO
        </span>
        <h2 id={tituloId} ref={tituloRef} tabIndex={-1} className={`m-0 text-2xl font-bold tracking-tight text-[#f2f4ef] rounded-sm ${ESTILO_FOCO}`}>
          Mi progreso
        </h2>
        <p className="m-0 mt-1 text-xs text-[#a9afa7]">
          {diaLocal && <><time dateTime={diaLocal}>{diaLocal}</time> · {pesoRegistrado === "" ? "Sin peso registrado" : `${pesoRegistrado} kg registrados`}<br /></>}
          Guarda tu peso para seguir tu evolución.
        </p>
      </header>

      <div>
        {/* Peso corporal */}
        <section aria-labelledby={`${pesoId}-titulo`} className="p-4 rounded-xl bg-[#171817] border border-[#30332f]">
          <div className="flex items-center justify-between mb-3">
            <h3 id={`${pesoId}-titulo`} className="m-0 text-xs font-bold uppercase tracking-wider text-[#a9afa7]">
              Peso corporal
            </h3>
          </div>

          <form onSubmit={enviarPeso} className="grid gap-3">
            <div>
              <label htmlFor={pesoId} className="block mb-1.5 text-sm font-semibold text-[#c8cbc5]">
                Peso (kg)
              </label>
              <input
                id={pesoId}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="20"
                max="300"
                value={habits.weight}
                onChange={(e) => editar("weight", e.target.value)}
                placeholder="Ej. 75.5"
                disabled={controlesBloqueados}
                aria-describedby={ayudaPesoId}
                className={`w-full bg-[#212320] border border-[#41433f] rounded-lg py-2.5 px-3 text-white font-medium text-lg placeholder-[#6f756b] focus:border-[#b56cff] disabled:opacity-60 transition ${ESTILO_FOCO}`}
              />
              <p id={ayudaPesoId} className="m-0 mt-1.5 text-[11px] text-[#6f756b]">
                Entre 20 y 300 kg, con un decimal.
              </p>
            </div>

            <button
              type="submit"
              disabled={guardando || !puedeGuardar}
              className={`w-full sm:w-auto sm:justify-self-start px-6 py-2.5 rounded-xl bg-[#b56cff] hover:bg-[#a24eed] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm tracking-wide transition shadow-lg shadow-[#b56cff]/20 cursor-pointer ${ESTILO_FOCO}`}
            >
              {guardando ? "Guardando..." : pesoRegistrado === "" ? "Registrar peso" : "Actualizar peso"}
            </button>
          </form>

          <div className="mt-3 text-xs min-h-[1.25rem]">
            {cargando && <p role="status" className="m-0 text-[#a9afa7]">Cargando tu progreso...</p>}
            {!cargando && avisoVisible && (
              <p
                role={avisoVisible.tipo === "exito" ? "status" : "alert"}
                className={`m-0 inline-flex flex-wrap items-center gap-1.5 font-medium ${
                  avisoVisible.tipo === "exito" ? "text-[#75dfa2]" : "text-[#ff9898]"
                }`}
              >
                {textoMensaje(avisoVisible, errorCarga)}
              </p>
            )}
            {errorCarga && (
              <button type="button" onClick={recargar} className={`mt-2 underline text-[#f2f4ef] rounded-sm ${ESTILO_FOCO}`}>
                Reintentar
              </button>
            )}
          </div>
        </section>
      </div>

      {conflicto && (
        <DailyMetricsConflict
          conflicto={conflicto}
          diaAnterior={diaLocal}
          consultarNuevoDia={consultarNuevoDia}
          resolverConflicto={resolverConflicto}
          formularioRef={tituloRef}
        />
      )}
    </article>
  );
}
