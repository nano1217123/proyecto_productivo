"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useTrainingHistory } from "../hooks/useTrainingHistory";

const ESTILO_FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";
const ESTILO_REINTENTO = `px-4 py-2.5 border-0 rounded-lg bg-[#b56cff] text-[#10110f] text-[13px] font-extrabold cursor-pointer transition hover:bg-[#d7adff] aria-disabled:opacity-60 aria-disabled:cursor-wait ${ESTILO_FOCO}`;
const ESTILO_ERROR = "p-4 border border-[rgba(255,121,121,0.32)] rounded-xl bg-[#351b1b]";

export default function TrainingHistoryPage({ gym = "jj-poblado" }) {
  const { loading, logout } = useAuth();
  const {
    sesiones, estadoHistorial, errorHistorial,
    ejercicioId: ejercicioSeleccionado, progreso, estadoProgreso, errorProgreso,
    recargarHistorial, seleccionarEjercicio, reintentarProgreso,
  } = useTrainingHistory();
  const selectorId = useId();
  const selectorRef = useRef(null);
  // Tras un reintento exitoso su botón desaparece: el foco pasa al selector.
  const reintentoRef = useRef(false);

  const historialListo = estadoHistorial === "listo";
  const cargandoHistorial = estadoHistorial === "cargando";
  const cargandoProgreso = estadoProgreso === "cargando";
  const progresoListo = estadoProgreso === "listo";

  useEffect(() => {
    if (!reintentoRef.current || cargandoHistorial || cargandoProgreso) return;
    reintentoRef.current = false;
    // Solo recupera el foco que se perdió con el botón; si el usuario pasó
    // a otro control mientras cargaba, no se lo quita.
    const activo = document.activeElement;
    const focoPerdido = !activo || activo === document.body;
    if (!errorHistorial && !errorProgreso && focoPerdido) selectorRef.current?.focus();
  }, [cargandoHistorial, cargandoProgreso, errorHistorial, errorProgreso]);

  function reintentar(accion) {
    reintentoRef.current = true;
    accion();
  }

  // Lista única de ejercicios que el usuario ya entrenó, extraída del
  // propio historial (no hace falta volver a cargar el catálogo completo).
  const ejerciciosEntrenados = useMemo(() => {
    const mapa = new Map();
    for (const sesion of sesiones) {
      for (const serie of sesion.series_entrenamiento || []) {
        if (serie.ejercicio_id && serie.ejercicios?.nombre) {
          mapa.set(serie.ejercicio_id, serie.ejercicios.nombre);
        }
      }
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [sesiones]);

  if (loading) {
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
          <span>Historial</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link className="text-[13px] text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard/entrenamientos?gym=${encodeURIComponent(gym)}`}>
            + Nuevo entrenamiento
          </Link>
          <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard?gym=${encodeURIComponent(gym)}`}>&larr; Inicio</Link>
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">ENTRENAMIENTO</p>
        <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">Tu historial</h1>
      </section>

      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-[18px] pb-10 items-start">
        {/* Columna izquierda: lista de sesiones */}
        <div className="grid gap-3" aria-busy={cargandoHistorial}>
          {errorHistorial && (
            <div className={ESTILO_ERROR}>
              <p role="alert" className="m-0 mb-3 text-[13px] text-[#ff7979]">{errorHistorial}</p>
              <button
                type="button"
                onClick={() => !cargandoHistorial && reintentar(recargarHistorial)}
                aria-disabled={cargandoHistorial}
                className={ESTILO_REINTENTO}
              >
                {cargandoHistorial ? "Cargando historial..." : "Reintentar historial"}
              </button>
            </div>
          )}
          {cargandoHistorial && !errorHistorial && (
            <p role="status" className="p-5 border border-[#41433f] rounded-xl bg-[#212320] text-sm text-[#a9afa7]">
              Cargando historial...
            </p>
          )}
          {historialListo && sesiones.length === 0 && (
            <p className="p-5 border border-[#41433f] rounded-xl bg-[#212320] text-sm text-[#a9afa7]">
              Todavía no registras ningún entrenamiento.
            </p>
          )}
          {sesiones.map((sesion) => (
            <div key={sesion.id} className="p-5 border border-[#41433f] rounded-xl bg-[#212320]">
              <div className="flex items-center justify-between mb-3">
                <strong className="text-[15px]">{new Date(sesion.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</strong>
                {sesion.notas && <span className="text-xs text-[#a9afa7]">{sesion.notas}</span>}
              </div>
              <div className="grid gap-1.5">
                {(sesion.series_entrenamiento || [])
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((serie) => (
                    <div key={serie.id} className="flex items-center justify-between text-[13px] text-[#c0c7bd]">
                      <span>{serie.ejercicios?.nombre || "Ejercicio"} — serie {serie.numero_serie}</span>
                      <span className="text-[#d7adff] font-semibold">{serie.repeticiones} reps{serie.peso_kg ? ` · ${serie.peso_kg} kg` : ""}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Columna derecha: gráfico de progreso */}
        <div className="p-[26px] border border-[#41433f] rounded-xl bg-[#212320]">
          <h2 className="m-0 mb-[18px] text-xl tracking-[-0.4px]">Progreso por ejercicio</h2>

          <label htmlFor={selectorId} className="block mb-2 text-xs font-bold text-[#c0c7bd]">
            Ejercicio
          </label>
          <select
            id={selectorId}
            ref={selectorRef}
            value={ejercicioSeleccionado}
            onChange={(e) => seleccionarEjercicio(e.target.value)}
            disabled={!historialListo}
            className={`w-full mb-5 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff] disabled:opacity-60 disabled:cursor-not-allowed ${ESTILO_FOCO}`}
          >
            <option value="">Selecciona un ejercicio entrenado</option>
            {ejerciciosEntrenados.map((ej) => (
              <option key={ej.id} value={ej.id}>{ej.nombre}</option>
            ))}
          </select>

          {!historialListo && (
            <p className="text-sm text-[#a9afa7]">El selector estará disponible cuando cargue tu historial.</p>
          )}

          {historialListo && !ejercicioSeleccionado && (
            <p className="text-sm text-[#a9afa7]">Elige un ejercicio para ver cómo ha evolucionado tu peso.</p>
          )}

          {ejercicioSeleccionado && errorProgreso && (
            <div className={`${ESTILO_ERROR} mb-5`}>
              <p role="alert" className="m-0 mb-3 text-[13px] text-[#ff7979]">{errorProgreso}</p>
              <button
                type="button"
                onClick={() => !cargandoProgreso && reintentar(reintentarProgreso)}
                aria-disabled={cargandoProgreso}
                className={ESTILO_REINTENTO}
              >
                {cargandoProgreso ? "Cargando progreso..." : "Reintentar progreso"}
              </button>
            </div>
          )}

          {ejercicioSeleccionado && cargandoProgreso && !errorProgreso && (
            <p role="status" className="text-sm text-[#a9afa7]">Cargando progreso...</p>
          )}

          {ejercicioSeleccionado && progresoListo && progreso.length === 0 && (
            <p className="text-sm text-[#a9afa7]">Todavía no hay suficientes registros de este ejercicio.</p>
          )}

          {ejercicioSeleccionado && progresoListo && progreso.length > 0 && (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={progreso} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30332f" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fill: "#a9afa7", fontSize: 11 }}
                    tickFormatter={(f) => new Date(f + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" })}
                  />
                  <YAxis tick={{ fill: "#a9afa7", fontSize: 11 }} unit=" kg" />
                  <Tooltip
                    contentStyle={{ background: "#151714", border: "1px solid #41463f", borderRadius: 8 }}
                    labelStyle={{ color: "#f2f4ef" }}
                    labelFormatter={(f) => new Date(f + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "long" })}
                    formatter={(value) => [`${value} kg`, "Peso máximo"]}
                  />
                  <Line type="monotone" dataKey="peso_max" stroke="#b56cff" strokeWidth={2} dot={{ fill: "#b56cff", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}