import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { exercisesApi } from "@/features/exercises/api/exercisesApi";
import { trainingApi } from "../api/trainingApi";

export function useTrainingSession() {
  const searchParams = useSearchParams();
  
  const [catalogo, setCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState("");
  const [filas, setFilas] = useState(() => {
    const rutinaParam = searchParams.get("rutina");
    if (!rutinaParam) return [nuevaFila()];
    return rutinaParam
      .split(",")
      .filter(Boolean)
      .map((id) => ({ ...nuevaFila(), ejercicioId: id }));
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  function nuevaFila() {
    return {
      id: crypto.randomUUID(),
      ejercicioId: "",
      repeticiones: "",
      pesoKg: "",
    };
  }

  useEffect(() => {
    exercisesApi.getExerciseCatalog()
      .then(setCatalogo)
      .catch((err) => setError(err.message))
      .finally(() => setCargandoCatalogo(false));
  }, []);

  const nombrePorId = useMemo(() => {
    const mapa = new Map();
    for (const grupo of catalogo) {
      for (const ej of grupo.ejercicios) mapa.set(String(ej.id), ej.nombre);
    }
    return mapa;
  }, [catalogo]);

  function actualizarFila(id, campo, valor) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, nuevaFila()]);
  }

  function quitarFila(id) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev));
  }

  async function guardarEntrenamiento(event) {
    if (event) event.preventDefault();
    setError("");
    setExito("");

    const filasValidas = filas.filter((f) => f.ejercicioId && f.repeticiones);
    if (filasValidas.length === 0) {
      setError("Agrega al menos una serie con ejercicio y repeticiones.");
      return;
    }

    const contador = new Map();
    const series = filasValidas.map((f) => {
      const actual = (contador.get(f.ejercicioId) || 0) + 1;
      contador.set(f.ejercicioId, actual);
      return {
        ejercicio_id: Number(f.ejercicioId),
        numero_serie: actual,
        repeticiones: Number(f.repeticiones),
        peso_kg: f.pesoKg ? Number(f.pesoKg) : null,
      };
    });

    setGuardando(true);
    try {
      await trainingApi.saveTrainingSession({ fecha, notas: notas.trim(), series });
      setExito("Entrenamiento guardado correctamente.");
      setFilas([nuevaFila()]);
      setNotas("");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return {
    catalogo, cargandoCatalogo,
    fecha, setFecha,
    notas, setNotas,
    filas, guardando, error, exito,
    nombrePorId,
    actualizarFila, agregarFila, quitarFila,
    guardarEntrenamiento
  };
}
