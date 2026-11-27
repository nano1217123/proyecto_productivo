"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { trainingApi } from "../api/trainingApi.js";

/**
 * Estado del historial de entrenamientos y del progreso por ejercicio.
 *
 * Cada carga tiene su propio estado ("cargando" | "listo" | "error") y su
 * propio contador de solicitudes: una respuesta (exitosa o fallida) solo se
 * aplica si sigue siendo la solicitud vigente. Cambiar o limpiar el
 * ejercicio, reintentar o desmontar la vista invalida las anteriores.
 */
export function createTrainingHistoryState({
  cargarHistorial = () => trainingApi.getTrainingHistory(),
  cargarProgreso = (ejercicioId) => trainingApi.getExerciseHistory(ejercicioId),
} = {}) {
  const listeners = new Set();
  let solicitudHistorial = 0;
  let solicitudProgreso = 0;
  let historialEnCurso = false;
  let estado = {
    sesiones: [],
    estadoHistorial: "cargando",
    errorHistorial: "",
    ejercicioId: "",
    progreso: [],
    estadoProgreso: "inactivo",
    errorProgreso: "",
  };

  function actualizar(cambios) {
    estado = { ...estado, ...cambios };
    for (const listener of listeners) listener();
  }

  async function recargarHistorial() {
    if (historialEnCurso) return;
    historialEnCurso = true;
    const actual = ++solicitudHistorial;
    // El error anterior se conserva durante el reintento para no retirar
    // el botón que tiene el foco; se limpia al resolver.
    actualizar({ estadoHistorial: "cargando" });
    try {
      const sesiones = await cargarHistorial();
      if (actual !== solicitudHistorial) return;
      actualizar({
        sesiones: Array.isArray(sesiones) ? sesiones : [],
        estadoHistorial: "listo",
        errorHistorial: "",
      });
    } catch (err) {
      if (actual !== solicitudHistorial) return;
      actualizar({
        estadoHistorial: "error",
        errorHistorial: err?.message || "No se pudo cargar el historial de entrenamientos.",
      });
    } finally {
      if (actual === solicitudHistorial) historialEnCurso = false;
    }
  }

  async function pedirProgreso() {
    const actual = ++solicitudProgreso;
    const ejercicioId = estado.ejercicioId;
    actualizar({ estadoProgreso: "cargando", progreso: [] });
    try {
      const progreso = await cargarProgreso(Number(ejercicioId));
      if (actual !== solicitudProgreso) return;
      actualizar({
        progreso: Array.isArray(progreso) ? progreso : [],
        estadoProgreso: "listo",
        errorProgreso: "",
      });
    } catch (err) {
      if (actual !== solicitudProgreso) return;
      actualizar({
        estadoProgreso: "error",
        errorProgreso: err?.message || "No se pudo cargar el historial de este ejercicio.",
      });
    }
  }

  function seleccionarEjercicio(ejercicioId) {
    const id = ejercicioId ? String(ejercicioId) : "";
    // Descarta cualquier respuesta de la selección anterior.
    solicitudProgreso++;
    actualizar({ ejercicioId: id, progreso: [], errorProgreso: "", estadoProgreso: "inactivo" });
    if (id) pedirProgreso();
  }

  function reintentarProgreso() {
    if (!estado.ejercicioId || estado.estadoProgreso === "cargando") return;
    pedirProgreso();
  }

  function cancelar() {
    solicitudHistorial++;
    solicitudProgreso++;
    historialEnCurso = false;
  }

  return {
    getSnapshot: () => estado,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    recargarHistorial,
    seleccionarEjercicio,
    reintentarProgreso,
    cancelar,
  };
}

export function useTrainingHistory() {
  const [historial] = useState(createTrainingHistoryState);
  const estado = useSyncExternalStore(historial.subscribe, historial.getSnapshot, historial.getSnapshot);

  useEffect(() => {
    historial.recargarHistorial();
    return historial.cancelar;
  }, [historial]);

  return {
    ...estado,
    recargarHistorial: historial.recargarHistorial,
    seleccionarEjercicio: historial.seleccionarEjercicio,
    reintentarProgreso: historial.reintentarProgreso,
  };
}
