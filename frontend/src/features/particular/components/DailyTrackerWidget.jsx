"use client";

import { useEffect, useRef, useState } from "react";
import { useDailyMetrics } from "../hooks/useDailyMetrics.js";
import DailyMetricsConflict from "./DailyMetricsConflict.jsx";

export default function DailyTrackerWidget() {
  const formularioRef = useRef(null);
  const { habits, errorCarga, guardando, mensaje, controlesBloqueados, puedeGuardar,
    editar, recargar, guardarCambios, conflicto, consultarNuevoDia, resolverConflicto } = useDailyMetrics();
  const [avisoOculto, setAvisoOculto] = useState(null);
  const avisoVisible = mensaje === avisoOculto ? null : mensaje;

  useEffect(() => {
    if (mensaje?.tipo !== "exito") return;

    const temporizador = setTimeout(() => setAvisoOculto(mensaje), 4000);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  const handleWaterChange = (delta) => {
    editar("water", (water) => Math.max(0, Math.min(12, water + delta)));
  };

  // Cálculo del porcentaje de cumplimiento de hábitos (0 a 3)
  const habitosCompletados =
    (habits.weight !== "" ? 1 : 0) +
    (habits.water >= 8 ? 1 : habits.water > 0 ? 0.5 : 0) +
    (habits.workoutDone ? 1 : 0);

  return (
    <article
      className="relative overflow-hidden p-6 md:p-7 border border-[#41433f] rounded-2xl bg-[#212320] text-[#f2f4ef] shadow-xl"
      aria-label="Tracker diario de hábitos"
    >
      {/* Detalle visual sutil de fondo */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#b56cff] opacity-10 blur-3xl"
        aria-hidden="true"
      />

      {/* Encabezado del Widget */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-[#30332f]">
        <div>
          <span className="inline-block text-[11px] font-extrabold tracking-[2px] uppercase text-[#b56cff] mb-1">
            SEGUIMIENTO RÁPIDO
          </span>
          <h2 ref={formularioRef} tabIndex={-1} className="m-0 text-2xl font-bold tracking-tight text-[#f2f4ef]">
            Tracker de Hábitos Diarios
          </h2>
          <p className="m-0 mt-1 text-xs text-[#a9afa7]">
            Registra tu progreso de hoy para mantener la consistencia en tus objetivos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#171817] px-3 py-1.5 rounded-full border border-[#30332f]">
          <span className="w-2 h-2 rounded-full bg-[#b56cff] animate-pulse" />
          <span className="text-xs font-semibold text-[#c8cbc5]">
            {habitosCompletados >= 3
              ? "¡Objetivos diarios cumplidos!"
              : `${Math.floor(habitosCompletados)} / 3 completados`}
          </span>
        </div>
      </header>

      {/* Grid de 3 hábitos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 1. Peso corporal */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-[#171817] border border-[#30332f] hover:border-[#41433f] transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a9afa7]">
              Peso Corporal
            </span>
            <span className="text-lg" aria-hidden="true">
              ⚖️
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={habits.weight}
              onChange={(e) => editar("weight", e.target.value)}
              placeholder="Ej. 75.5"
              disabled={controlesBloqueados}
              className="w-full bg-[#212320] border border-[#41433f] rounded-lg py-2.5 px-3 pr-10 text-white font-medium text-lg placeholder-[#6f756b] outline-none focus:border-[#b56cff] transition"
            />
            <span className="absolute right-3 text-xs font-bold text-[#a9afa7] pointer-events-none">
              kg
            </span>
          </div>

          <p className="m-0 mt-2 text-[11px] text-[#6f756b]">
            Actualiza tu peso para seguir tu evolución.
          </p>
        </div>

        {/* 2. Vasos de agua */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-[#171817] border border-[#30332f] hover:border-[#41433f] transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a9afa7]">
              Hidratación
            </span>
            <span className="text-lg text-blue-400" aria-hidden="true">
              💧
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-2xl font-extrabold text-[#f2f4ef]">
                {habits.water}
              </span>
              <span className="text-xs text-[#a9afa7] font-semibold ml-1.5">
                / 8 vasos
              </span>
            </div>
            {habits.water >= 8 && (
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-[rgba(91,212,143,.18)] border border-[rgba(91,212,143,.45)] text-[#75dfa2]">
                Meta alcanzada
              </span>
            )}
          </div>

          {/* Barra de progreso de hidratación */}
          <div
            className="w-full h-1.5 bg-[#212320] rounded-full overflow-hidden mb-3"
            aria-hidden="true"
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-[#b56cff] transition-all duration-300"
              style={{ width: `${Math.min(100, (habits.water / 8) * 100)}%` }}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleWaterChange(-1)}
              disabled={habits.water <= 0 || controlesBloqueados}
              className="flex-1 py-1.5 px-2 bg-[#212320] hover:bg-[#2d302c] disabled:opacity-30 disabled:pointer-events-none border border-[#41433f] rounded-lg text-xs font-bold text-[#c8cbc5] transition active:scale-95"
              aria-label="Restar un vaso de agua"
            >
              - 1 vaso
            </button>
            <button
              type="button"
              onClick={() => handleWaterChange(1)}
              disabled={controlesBloqueados}
              className="flex-1 py-1.5 px-2 bg-[#b56cff]/20 hover:bg-[#b56cff]/30 border border-[#b56cff]/50 rounded-lg text-xs font-bold text-[#f2f4ef] transition active:scale-95"
              aria-label="Sumar un vaso de agua"
            >
              + 1 vaso
            </button>
          </div>
        </div>

        {/* 3. Entrenamiento del día */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-[#171817] border border-[#30332f] hover:border-[#41433f] transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a9afa7]">
              Entrenamiento
            </span>
            <span className="text-lg" aria-hidden="true">
              🏋️‍♂️
            </span>
          </div>

          <button
            type="button"
            onClick={() => editar("workoutDone", (completado) => !completado)}
            disabled={controlesBloqueados}
            className={`w-full py-3 px-3 rounded-lg border font-semibold text-sm flex items-center justify-between transition active:scale-[0.98] ${
              habits.workoutDone
                ? "border-[#b56cff] bg-[#b56cff]/15 text-white shadow-md shadow-[#b56cff]/10"
                : "border-[#41433f] bg-[#212320] text-[#a9afa7] hover:border-[#6f756b]"
            }`}
          >
            <span>{habits.workoutDone ? "¡Entrenamiento listo!" : "¿Entrenaste hoy?"}</span>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                habits.workoutDone
                  ? "bg-[#b56cff] text-white"
                  : "bg-[#30332f] text-[#6f756b]"
              }`}
            >
              {habits.workoutDone ? "✓" : "○"}
            </span>
          </button>

          <p className="m-0 mt-2 text-[11px] text-[#6f756b]">
            {habits.workoutDone
              ? "Sesión registrada para el día de hoy."
              : "Toca el botón para marcar la sesión como completada."}
          </p>
        </div>
      </div>

      {/* Pie de acción y feedback */}
      {conflicto && (
        <DailyMetricsConflict
          conflicto={conflicto}
          consultarNuevoDia={consultarNuevoDia}
          resolverConflicto={resolverConflicto}
          formularioRef={formularioRef}
        />
      )}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#30332f]">
        <div className="text-xs">
          {avisoVisible ? (
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                avisoVisible.tipo === "exito" ? "text-[#75dfa2]" : "text-[#ff9898]"
              }`}
            >
              <span>{avisoVisible.tipo === "exito" ? "✓" : "⚠"}</span>
              {avisoVisible.texto}
            </span>
          ) : (
            <span className="text-[#6f756b]">
              Los datos se sincronizan con tu historial en la nube.
            </span>
          )}
          {errorCarga && (
            <button type="button" onClick={recargar} className="ml-2 underline">
              Reintentar
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={guardarCambios}
          disabled={guardando || !puedeGuardar}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#b56cff] hover:bg-[#a24eed] active:scale-[0.98] disabled:opacity-50 text-white font-extrabold text-sm tracking-wide transition shadow-lg shadow-[#b56cff]/20 cursor-pointer"
        >
          {guardando ? "Guardando..." : "Guardar Hábitos"}
        </button>
      </footer>
    </article>
  );
}
