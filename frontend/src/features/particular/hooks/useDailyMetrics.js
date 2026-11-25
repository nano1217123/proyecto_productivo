"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { guardarMetricasHoy, obtenerMetricasHoy } from "../api/particularApi.js";

function leerMetricas(respuesta, admiteVacio) {
  const datos = respuesta?.data;
  const vacio = admiteVacio && datos === null;
  const esFila = datos && typeof datos === "object" && !Array.isArray(datos) &&
    (datos.pesoActualKg === null || Number.isFinite(datos.pesoActualKg)) &&
    Number.isInteger(datos.vasosAgua) && typeof datos.entrenamientoCompletado === "boolean";
  if (respuesta?.success !== true || (!vacio && !esFila)) {
    throw new Error("La respuesta de métricas no es válida.");
  }

  return {
    weight: datos?.pesoActualKg == null ? "" : String(datos.pesoActualKg),
    water: datos?.vasosAgua ?? 0,
    workoutDone: datos?.entrenamientoCompletado ?? false,
  };
}

function pesoNumerico(weight) {
  return weight === "" ? undefined : Number(weight);
}

function cambiosMetricas(habits, confirmadas, parcial) {
  const peso = pesoNumerico(habits.weight);
  const cambios = {};
  if (!parcial || peso !== pesoNumerico(confirmadas.weight)) cambios.pesoActualKg = peso;
  if (!parcial || habits.water !== confirmadas.water) cambios.vasosAgua = habits.water;
  if (!parcial || habits.workoutDone !== confirmadas.workoutDone) {
    cambios.entrenamientoCompletado = habits.workoutDone;
  }
  return cambios;
}

export function createDailyMetricsState({
  cargar = obtenerMetricasHoy,
  guardar = guardarMetricasHoy,
} = {}) {
  const listeners = new Set();
  let solicitud = 0;
  let confirmadas = null;
  let parcial = false;
  let estado = {
    habits: { weight: "", water: 0, workoutDone: false },
    cargando: true,
    errorCarga: false,
    guardando: false,
    puedeGuardar: false,
    mensaje: null,
  };

  function actualizar(cambios) {
    estado = { ...estado, ...cambios };
    for (const listener of listeners) listener();
  }

  async function recargar() {
    if (estado.guardando || (!estado.cargando && !estado.errorCarga)) return;
    const actual = ++solicitud;
    actualizar({ cargando: true, errorCarga: false, puedeGuardar: false, mensaje: null });
    try {
      const respuesta = await cargar();
      if (actual !== solicitud) return;
      confirmadas = leerMetricas(respuesta, true);
      parcial = respuesta.capacidades?.actualizacionParcial === true;
      actualizar({ habits: confirmadas, cargando: false, puedeGuardar: !parcial });
    } catch {
      if (actual !== solicitud) return;
      actualizar({
        cargando: false,
        errorCarga: true,
        mensaje: { tipo: "error", texto: "No se pudieron cargar las métricas de hoy." },
      });
    }
  }

  function editar(campo, valor) {
    if (estado.cargando || estado.errorCarga || estado.guardando) return;
    const habits = {
      ...estado.habits,
      [campo]: typeof valor === "function" ? valor(estado.habits[campo]) : valor,
    };
    const puedeGuardar = Object.keys(cambiosMetricas(habits, confirmadas, parcial)).length > 0;
    actualizar({ habits, puedeGuardar, mensaje: null });
  }

  async function guardarCambios() {
    if (!estado.puedeGuardar || estado.guardando) return;
    const datos = cambiosMetricas(estado.habits, confirmadas, parcial);
    if (parcial && Object.hasOwn(datos, "pesoActualKg") && datos.pesoActualKg === undefined) {
      actualizar({ mensaje: { tipo: "error", texto: "Ingresa un peso válido para actualizarlo." } });
      return;
    }

    const actual = ++solicitud;
    actualizar({ guardando: true, mensaje: null });
    try {
      const respuesta = await guardar(datos);
      if (actual !== solicitud) return;
      confirmadas = leerMetricas(respuesta, false);
      actualizar({
        habits: confirmadas,
        guardando: false,
        puedeGuardar: !parcial,
        mensaje: { tipo: "exito", texto: "Progreso diario guardado correctamente." },
      });
    } catch (error) {
      if (actual !== solicitud) return;
      actualizar({
        guardando: false,
        mensaje: { tipo: "error", texto: error?.message || "No se pudo guardar el progreso. Intenta nuevamente." },
      });
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => estado,
    recargar,
    editar,
    guardarCambios,
    cancelar: () => { solicitud++; },
  };
}

export function useDailyMetrics() {
  const [tracker] = useState(createDailyMetricsState);
  const estado = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, tracker.getSnapshot);

  useEffect(() => {
    tracker.recargar();
    return tracker.cancelar;
  }, [tracker]);

  return {
    ...estado,
    controlesBloqueados: estado.cargando || estado.errorCarga || estado.guardando,
    editar: tracker.editar,
    recargar: tracker.recargar,
    guardarCambios: tracker.guardarCambios,
  };
}
