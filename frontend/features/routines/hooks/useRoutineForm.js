import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { exercisesApi } from "@/features/exercises/api/exercisesApi";
import { routinesApi } from "../api/routinesApi";

export function useRoutineForm(gym = "jj-poblado", rutinaId = null) {
  const router = useRouter();
  const esEdicion = Boolean(rutinaId);

  const [catalogo, setCatalogo] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [nombre, setNombre] = useState("");
  const [diaEtiqueta, setDiaEtiqueta] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [ejercicioAAgregar, setEjercicioAAgregar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const cat = await exercisesApi.getExerciseCatalog();
        setCatalogo(cat);

        if (esEdicion) {
          const rutina = await routinesApi.getRoutineDetail(rutinaId);
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

  const nombrePorId = new Map();
  for (const grupo of catalogo) {
    for (const ej of grupo.ejercicios) nombrePorId.set(String(ej.id), ej.nombre);
  }

  function agregarEjercicio() {
    if (!ejercicioAAgregar) return;
    setSeleccionados((prev) => [...prev, { ejercicio_id: Number(ejercicioAAgregar), nombre: nombrePorId.get(ejercicioAAgregar) }]);
    setEjercicioAAgregar("");
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
      router.push(`/dashboard/rutinas?gym=${encodeURIComponent(gym)}`);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return {
    esEdicion, catalogo, cargandoDatos,
    nombre, setNombre,
    diaEtiqueta, setDiaEtiqueta,
    seleccionados, ejercicioAAgregar, setEjercicioAAgregar,
    guardando, error,
    agregarEjercicio, quitarEjercicio, moverEjercicio,
    guardarRutina
  };
}
