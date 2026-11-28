import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { exercisesApi } from "@/src/features/exercises/api/exercisesApi";
import { trainingApi } from "@/src/features/training/api/trainingApi";
import { routinesApi } from "../api/routinesApi";
import { exerciseType, fieldsFor, routineUrl } from "../routineModel";

const empty = { nombre: "", diaEtiqueta: "", descripcion: "", objetivo: "", notas: "", dias: [] };
const payload = (info, items) => ({
  ...info,
  ejercicioIds: items.map((item) => item.ejercicio_id),
  planes: items.map((item) => item.plan),
});

function fromTraining(session, catalog) {
  if (!session?.sesion) throw new Error("No se encontró la sesión finalizada.");
  return session.sesion.ejercicios.map((item) => {
    const sets = item.series.filter((set) => set.completada);
    const first = sets[0];
    const reps = sets.map((set) => set.repeticiones).filter((value) => value != null);
    const min = reps.length ? Math.min(...reps) : null;
    const max = reps.length ? Math.max(...reps) : null;
    const plan = { tipo: item.tipo, series: item.tipo === "cardio" ? 1 : sets.length,
      descanso: item.descanso, notas: item.notas, repeticiones: min, repeticionesMax: max === min ? null : max,
      duracionSeg: item.tipo === "movilidad" && min != null ? null : first?.duracion_seg,
      pesoKg: first?.peso_kg, asistenciaKg: first?.asistencia_kg, distanciaKm: first?.distancia_km };
    return { ...catalog.find((exercise) => exercise.id === item.ejercicio_id), ejercicio_id: item.ejercicio_id, plan };
  });
}

function normalizeItem(item, key) {
  const tipo = exerciseType(item);
  const timed = item.plan?.duracionSeg != null;
  const plan = { tipo, notas: item.plan?.notas ?? null };
  for (const field of fieldsFor(tipo, timed)) plan[field] = item.plan?.[field] ?? (field === "series" ? 1 : null);
  return { ...item, key, plan, timed };
}

export function useRoutineForm(gym, rutinaId, copia, entrenamiento, enabled) {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [info, setInfo] = useState(empty);
  const [seleccionados, setSeleccionados] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  const pending = useRef(false);
  const requestId = useRef(null);
  const inicial = useRef(JSON.stringify(payload(empty, [])));
  const cambiosPendientes = !cargandoDatos && !loadError && JSON.stringify(payload(info, seleccionados)) !== inicial.current;

  useEffect(() => {
    if (!cambiosPendientes) return;
    const destinoActual = window.location.href;
    const estadoActual = window.history.state;
    const mensaje = "Tienes cambios sin guardar. ¿Quieres descartarlos?";

    function confirmarHistorial(event) {
      if (pending.current || window.location.href === destinoActual || window.confirm(mensaje)) return;

      // Next también escucha popstate. Al cancelar, conserva el formulario
      // montado y repone su entrada de historial antes de que cambie la ruta.
      event.stopImmediatePropagation();
      window.history.pushState(estadoActual, "", destinoActual);
    }

    function confirmarSalida(event) {
      if (pending.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function confirmarEnlace(event) {
      const enlace = event.target.closest?.("a[href]");
      const cerrarSesion = event.target.closest?.("[data-salida-rutina]");
      if (!cerrarSesion && (!enlace || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || enlace.target === "_blank" || enlace.href === location.href)) return;
      if (!window.confirm(mensaje)) event.preventDefault();
    }
    window.addEventListener("popstate", confirmarHistorial, true);
    window.addEventListener("beforeunload", confirmarSalida);
    document.addEventListener("click", confirmarEnlace, true);
    return () => {
      window.removeEventListener("popstate", confirmarHistorial, true);
      window.removeEventListener("beforeunload", confirmarSalida);
      document.removeEventListener("click", confirmarEnlace, true);
    };
  }, [cambiosPendientes]);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const source = rutinaId || copia;
    setLoadError("");
    setCargandoDatos(true);
    Promise.all([
      exercisesApi.getExerciseCatalog(),
      source ? routinesApi.getRoutineDetail(source) : null,
      entrenamiento && !source ? trainingApi.getTrainingHistory() : null,
    ]).then(([groups, routine, history]) => {
      if (!current) return;
      let details = empty;
      let items = [];
      if (routine) {
        details = { nombre: copia ? `${routine.nombre.slice(0, 52)} (copia)` : routine.nombre,
          diaEtiqueta: routine.dia_etiqueta || "", descripcion: routine.descripcion || "",
          objetivo: routine.objetivo || "", notas: routine.notas || "", dias: routine.dias };
        items = routine.ejercicios;
      } else if (history) {
        const session = history.find((entry) => entry.id === entrenamiento);
        items = fromTraining(session, groups.flatMap((group) => group.ejercicios));
        details = { ...empty, nombre: (session.nombre || "Entrenamiento").slice(0, 60), notas: session.notas || "" };
      }
      const configured = items.map((item) => normalizeItem(item, ++sequence.current));
      inicial.current = JSON.stringify(payload(details, configured));
      setInfo(details);
      setSeleccionados(configured);
      setCatalogo(groups);
    }).catch((err) => { if (current) setLoadError(err.message); })
      .finally(() => { if (current) setCargandoDatos(false); });
    return () => { current = false; };
  }, [enabled, rutinaId, copia, entrenamiento, retry]);

  function changeInfo(field, value) {
    setInfo((previous) => ({ ...previous, [field]: value }));
  }

  function agregarEjercicio(ejercicio, replacing) {
    const next = normalizeItem({ ...ejercicio, ejercicio_id: ejercicio.id }, ++sequence.current);
    setSeleccionados((prev) => replacing == null
      ? (prev.length < 30 && !prev.some((item) => item.ejercicio_id === ejercicio.id) ? [...prev, next] : prev)
      : prev.map((item) => item.key === replacing ? next : item));
  }

  function configurarEjercicio(key, field, value) {
    setSeleccionados((previous) => previous.map((item) => {
      if (item.key !== key) return item;
      if (field === "tipo" || field === "timed") {
        const tipo = field === "tipo" ? value : item.plan.tipo;
        const timed = field === "timed" ? value : false;
        const next = normalizeItem({ ...item, plan: { ...item.plan, tipo, duracionSeg: timed ? item.plan.duracionSeg : null } }, key);
        if (timed) {
          delete next.plan.repeticiones;
          delete next.plan.repeticionesMax;
          next.plan.duracionSeg = item.plan.duracionSeg ?? null;
        }
        return { ...next, timed };
      }
      const parsed = value === "" ? null : field === "notas" ? value : Number(value);
      return { ...item, plan: { ...item.plan, [field]: parsed } };
    }));
  }

  function quitarEjercicio(key) {
    setSeleccionados((prev) => prev.filter((item) => item.key !== key));
  }

  function moverEjercicio(index, delta) {
    setSeleccionados((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function guardarRutina(event) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    if (!seleccionados.length) {
      setError("Agrega al menos un ejercicio a la rutina.");
      return;
    }
    const input = payload(info, seleccionados);
    pending.current = true;
    setGuardando(true);
    try {
      let id = rutinaId;
      if (id) await routinesApi.updateRoutine({ rutinaId: id, ...input });
      else {
        requestId.current ??= crypto.randomUUID();
        ({ id } = await routinesApi.createRoutine({ ...input, solicitudId: requestId.current }));
      }
      inicial.current = JSON.stringify(input);
      router.replace(routineUrl(gym, `/${id}`));
    } catch (err) {
      if (err.status === 400) requestId.current = null;
      setError(err.message);
      setGuardando(false);
      pending.current = false;
    }
  }

  return { catalogo, cargandoDatos, info, changeInfo, seleccionados, guardando, error, loadError,
    retryLoad: () => setRetry((value) => value + 1), agregarEjercicio, quitarEjercicio, moverEjercicio,
    configurarEjercicio, guardarRutina };
}
