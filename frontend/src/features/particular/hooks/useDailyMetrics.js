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

function diaValido(dia) {
  if (typeof dia !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const fecha = new Date(`${dia}T00:00:00.000Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === dia;
}

function leerDiaDiario(respuesta) {
  if (!diaValido(respuesta.diaLocal)) throw new Error("El día de las métricas no es válido.");
  return respuesta.diaLocal;
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

function hayCambios(habits, confirmadas, parcial) {
  const cambios = cambiosMetricas(habits, confirmadas, true);
  if (!parcial && cambios.pesoActualKg === undefined) delete cambios.pesoActualKg;
  return Object.keys(cambios).length > 0;
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
    diaLocal: null,
    pesoRegistrado: "",
    conflicto: null,
  };

  function actualizar(cambios) {
    estado = { ...estado, ...cambios };
    for (const listener of listeners) listener();
  }

  async function recargar() {
    if (estado.conflicto || estado.guardando || (!estado.cargando && !estado.errorCarga)) return;
    const actual = ++solicitud;
    actualizar({ cargando: true, errorCarga: false, puedeGuardar: false, mensaje: null });
    try {
      const respuesta = await cargar();
      if (actual !== solicitud) return;
      const habits = leerMetricas(respuesta, true);
      const modoParcial = respuesta.capacidades?.actualizacionParcial === true;
      const diaLocal = modoParcial ? leerDiaDiario(respuesta) : null;
      confirmadas = habits;
      parcial = modoParcial;
      actualizar({ habits, diaLocal, pesoRegistrado: habits.weight, cargando: false });
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
    if (estado.conflicto || estado.cargando || estado.errorCarga || estado.guardando) return;
    const habits = {
      ...estado.habits,
      [campo]: typeof valor === "function" ? valor(estado.habits[campo]) : valor,
    };
    const puedeGuardar = hayCambios(habits, confirmadas, parcial);
    actualizar({ habits, puedeGuardar, mensaje: null });
  }

  async function guardarCambios() {
    if (!estado.puedeGuardar || estado.guardando || estado.conflicto) return;
    const datos = cambiosMetricas(estado.habits, confirmadas, parcial);
    if (parcial && Object.hasOwn(datos, "pesoActualKg") && datos.pesoActualKg === undefined) {
      actualizar({ mensaje: { tipo: "error", texto: "Ingresa un peso válido para actualizarlo." } });
      return;
    }

    const actual = ++solicitud;
    actualizar({ guardando: true, mensaje: null });
    try {
      const respuesta = await guardar(parcial ? { diaEsperado: estado.diaLocal, ...datos } : datos);
      if (actual !== solicitud) return;
      confirmadas = leerMetricas(respuesta, false);
      actualizar({
        habits: confirmadas,
        pesoRegistrado: confirmadas.weight,
        guardando: false,
        puedeGuardar: false,
        mensaje: { tipo: "exito", texto: "Progreso diario guardado correctamente." },
      });
    } catch (error) {
      if (actual !== solicitud) return;
      if (parcial && error?.status === 409 && error.body?.codigo === "DIA_METRICAS_CAMBIO") {
        const diaInformado = diaValido(error.body.diaLocal) ? error.body.diaLocal : null;
        actualizar({
          guardando: false,
          puedeGuardar: false,
          conflicto: { cambios: datos, diaInformado, nuevoDia: null, consultando: false, error: null },
        });
        return;
      }
      actualizar({
        guardando: false,
        mensaje: { tipo: "error", texto: error?.message || "No se pudo guardar el progreso. Intenta nuevamente." },
      });
    }
  }

  async function consultarNuevoDia() {
    if (!estado.conflicto) return;
    const actual = ++solicitud;
    actualizar({ conflicto: { ...estado.conflicto, nuevoDia: null, consultando: true, error: null } });
    try {
      const respuesta = await cargar();
      if (actual !== solicitud) return;
      const habits = leerMetricas(respuesta, true);
      if (respuesta.capacidades?.actualizacionParcial !== true) {
        throw new Error("El guardado diario ya no está disponible.");
      }
      const diaLocal = leerDiaDiario(respuesta);
      if (diaLocal === estado.diaLocal || (estado.conflicto.diaInformado && diaLocal < estado.conflicto.diaInformado)) {
        throw new Error("La consulta aún muestra un día anterior al informado por el servidor.");
      }
      actualizar({ conflicto: { ...estado.conflicto, nuevoDia: { habits, diaLocal }, consultando: false } });
    } catch {
      if (actual !== solicitud) return;
      actualizar({
        conflicto: {
          ...estado.conflicto,
          consultando: false,
          error: "No se pudieron cargar las métricas del nuevo día. Puedes reintentar.",
        },
      });
    }
  }

  function resolverConflicto(seleccion = []) {
    const conflicto = estado.conflicto;
    if (!conflicto?.nuevoDia || conflicto.consultando) return;
    const { habits: nuevos, diaLocal } = conflicto.nuevoDia;
    const cambios = conflicto.cambios;
    const habits = { ...nuevos };
    if (seleccion.includes("pesoActualKg") && Object.hasOwn(cambios, "pesoActualKg")) {
      habits.weight = String(cambios.pesoActualKg);
    }
    if (seleccion.includes("vasosAgua") && Object.hasOwn(cambios, "vasosAgua")) habits.water = cambios.vasosAgua;
    if (seleccion.includes("entrenamientoCompletado") && Object.hasOwn(cambios, "entrenamientoCompletado")) {
      habits.workoutDone = cambios.entrenamientoCompletado;
    }
    confirmadas = nuevos;
    actualizar({
      habits, diaLocal, pesoRegistrado: nuevos.weight, conflicto: null, mensaje: null,
      puedeGuardar: hayCambios(habits, confirmadas, parcial),
    });
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
    consultarNuevoDia,
    resolverConflicto,
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
    controlesBloqueados: estado.cargando || estado.errorCarga || estado.guardando || Boolean(estado.conflicto),
    editar: tracker.editar,
    recargar: tracker.recargar,
    guardarCambios: tracker.guardarCambios,
    consultarNuevoDia: tracker.consultarNuevoDia,
    resolverConflicto: tracker.resolverConflicto,
  };
}
