import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { exercisesApi } from "@/src/features/exercises/api/exercisesApi";
import { routinesApi } from "../api/routinesApi";

const firmaEjercicios = (items) => items.map(({ ejercicio_id, plan }) => [ejercicio_id, plan || {}]);

export function useRoutineForm(gym = "jj-poblado", rutinaId = null) {
  const router = useRouter();
  const esEdicion = Boolean(rutinaId);

  const [catalogo, setCatalogo] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [nombre, setNombre] = useState("");
  const [diaEtiqueta, setDiaEtiqueta] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const inicial = useRef(JSON.stringify(["", "", []]));
  const cambiosPendientes = !cargandoDatos && JSON.stringify([nombre, diaEtiqueta, firmaEjercicios(seleccionados)]) !== inicial.current;

  useEffect(() => {
    if (!cambiosPendientes) return;
    const destinoActual = window.location.href;
    const estadoActual = window.history.state;
    const mensaje = "Tienes cambios sin guardar. ¿Quieres descartarlos?";

    function confirmarHistorial(event) {
      if (window.location.href === destinoActual || window.confirm(mensaje)) return;

      // Next también escucha popstate. Al cancelar, conserva el formulario
      // montado y repone su entrada de historial antes de que cambie la ruta.
      event.stopImmediatePropagation();
      window.history.pushState(estadoActual, "", destinoActual);
    }

    function confirmarSalida(event) {
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
    async function cargar() {
      try {
        const cat = await exercisesApi.getExerciseCatalog();
        setCatalogo(cat);

        if (esEdicion) {
          const rutina = await routinesApi.getRoutineDetail(rutinaId);
          inicial.current = JSON.stringify([rutina.nombre, rutina.dia_etiqueta || "", firmaEjercicios(rutina.ejercicios)]);
          setNombre(rutina.nombre);
          setDiaEtiqueta(rutina.dia_etiqueta || "");
          setSeleccionados(rutina.ejercicios.map((e) => ({ ejercicio_id: e.ejercicio_id, nombre: e.nombre, plan: e.plan })));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setCargandoDatos(false);
      }
    }
    cargar();
  }, [rutinaId, esEdicion]);

  function agregarEjercicio(ejercicio) {
    setSeleccionados((prev) => [...prev, { ejercicio_id: Number(ejercicio.id), nombre: ejercicio.nombre }]);
  }

  function configurarEjercicio(idx, campo, valor) {
    setSeleccionados((prev) => prev.map((item, i) => i === idx
      ? { ...item, plan: { ...item.plan, [campo]: valor === "" ? null : Number(valor) } }
      : item));
  }

  function quitarEjercicio(idx) {
    setSeleccionados((prev) => prev.filter((_, i) => i !== idx));
  }

  function moverEjercicio(idx, direccion) {
    setSeleccionados((prev) => {
      const next = [...prev];
      const destino = idx + direccion;
      if (destino < 0 || destino >= next.length) return prev;
      [next[idx], next[destino]] = [next[destino], next[idx]];
      return next;
    });
  }

  async function guardarRutina(event) {
    if (event) event.preventDefault();
    setError("");

    if (seleccionados.length === 0) {
      setError("Agrega al menos un ejercicio a la rutina.");
      return;
    }

    setGuardando(true);
    try {
      const ejercicioIds = seleccionados.map((s) => s.ejercicio_id);
      const planes = seleccionados.map((item) => item.plan ?? null);
      if (esEdicion) {
        await routinesApi.updateRoutine({ rutinaId, nombre, diaEtiqueta, ejercicioIds, planes });
      } else {
        await routinesApi.createRoutine({ nombre, diaEtiqueta, ejercicioIds, planes });
      }
      const destino = esEdicion ? `/dashboard/rutinas/${encodeURIComponent(rutinaId)}` : "/dashboard/rutinas";
      router.push(`${destino}?gym=${encodeURIComponent(gym)}`);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return {
    esEdicion, catalogo, cargandoDatos,
    nombre, setNombre,
    diaEtiqueta, setDiaEtiqueta,
    seleccionados,
    guardando, error,
    agregarEjercicio, quitarEjercicio, moverEjercicio, configurarEjercicio,
    guardarRutina
  };
}
