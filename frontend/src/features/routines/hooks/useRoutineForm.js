import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { exercisesApi } from "@/src/features/exercises/api/exercisesApi";
import { routinesApi } from "../api/routinesApi";

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
  const cambiosPendientes = !cargandoDatos && JSON.stringify([nombre, diaEtiqueta, seleccionados.map((item) => item.ejercicio_id)]) !== inicial.current;

  useEffect(() => {
    if (!cambiosPendientes) return;
    function confirmarSalida(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    function confirmarEnlace(event) {
      const enlace = event.target.closest?.("a[href]");
      const cerrarSesion = event.target.closest?.("[data-salida-rutina]");
      if (!cerrarSesion && (!enlace || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || enlace.target === "_blank" || enlace.href === location.href)) return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?")) event.preventDefault();
    }
    window.addEventListener("beforeunload", confirmarSalida);
    document.addEventListener("click", confirmarEnlace, true);
    return () => {
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
          inicial.current = JSON.stringify([rutina.nombre, rutina.dia_etiqueta || "", rutina.ejercicios.map((item) => item.ejercicio_id)]);
          setNombre(rutina.nombre);
          setDiaEtiqueta(rutina.dia_etiqueta || "");
          setSeleccionados(rutina.ejercicios.map((e) => ({ ejercicio_id: e.ejercicio_id, nombre: e.nombre })));
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
      if (esEdicion) {
        await routinesApi.updateRoutine({ rutinaId, nombre, diaEtiqueta, ejercicioIds });
      } else {
        await routinesApi.createRoutine({ nombre, diaEtiqueta, ejercicioIds });
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
    agregarEjercicio, quitarEjercicio, moverEjercicio,
    guardarRutina
  };
}
