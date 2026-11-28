import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { exercisesApi } from "@/src/features/exercises/api/exercisesApi";
import { trainingApi } from "../api/trainingApi";
import { validarSeries } from "./validarSeries";

export function useTrainingSession() {
  const searchParams = useSearchParams();
  
  const [catalogo, setCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState("");
  // Identifica la solicitud vigente del catálogo para descartar respuestas
  // obsoletas, y evita lanzar otra mientras hay una en curso.
  const solicitudCatalogoRef = useRef(0);
  const catalogoEnCursoRef = useRef(false);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState("");
  const [filas, setFilas] = useState(() => {
    const rutinaParam = searchParams.get("rutina");
    if (!rutinaParam) return [];
    return rutinaParam
      .split(",")
      .filter(Boolean)
      .map((id) => nuevaFila(id));
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [erroresFilas, setErroresFilas] = useState({});
  const [focoValidacion, setFocoValidacion] = useState(null);
  const [exito, setExito] = useState("");

  function nuevaFila(ejercicioId) {
    return {
      id: crypto.randomUUID(),
      ejercicioId,
      repeticiones: "",
      pesoKg: "",
    };
  }

  // Solo consulta el catálogo: no toca fecha, notas ni filas en memoria.
  const cargarCatalogo = useCallback(() => {
    if (catalogoEnCursoRef.current) return;
    catalogoEnCursoRef.current = true;
    const solicitud = ++solicitudCatalogoRef.current;
    setCargandoCatalogo(true);

    exercisesApi.getExerciseCatalog()
      .then((grupos) => {
        if (solicitud !== solicitudCatalogoRef.current) return;
        setCatalogo(grupos);
        setErrorCatalogo("");
      })
      .catch((err) => {
        if (solicitud !== solicitudCatalogoRef.current) return;
        setErrorCatalogo(err.message || "No se pudo cargar el catálogo de ejercicios.");
      })
      .finally(() => {
        if (solicitud !== solicitudCatalogoRef.current) return;
        catalogoEnCursoRef.current = false;
        setCargandoCatalogo(false);
      });
  }, []);

  useEffect(() => {
    cargarCatalogo();
    return () => {
      // Invalida la solicitud en curso al desmontar.
      solicitudCatalogoRef.current += 1;
      catalogoEnCursoRef.current = false;
    };
  }, [cargarCatalogo]);

  function limpiarErrorFila(id) {
    setErroresFilas(({ [id]: descartado, ...resto }) => resto);
  }

  function actualizarFila(id, campo, valor) {
    if (campo === "repeticiones") limpiarErrorFila(id);
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila(ejercicioId) {
    const fila = nuevaFila(String(ejercicioId));
    setFilas((prev) => [...prev, fila]);
    return fila.id;
  }

  function quitarFila(id) {
    limpiarErrorFila(id);
    setFilas((prev) => prev.filter((f) => f.id !== id));
  }

  async function guardarEntrenamiento(event) {
    if (event) event.preventDefault();
    if (guardando) return;
    setError("");
    setExito("");

    const { errores, series } = validarSeries(filas, catalogo);
    setErroresFilas(errores);
    const primeraInvalida = Object.keys(errores)[0];
    if (primeraInvalida) {
      setFocoValidacion({ id: primeraInvalida });
      setError("Revisa las series marcadas antes de guardar.");
      return;
    }
    if (series.length === 0) {
      setError("Agrega al menos una serie con ejercicio y repeticiones.");
      return;
    }

    setGuardando(true);
    try {
      await trainingApi.saveTrainingSession({ fecha, notas: notas.trim(), series });
      setExito("Entrenamiento guardado correctamente.");
      setFilas([]);
      setNotas("");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return {
    catalogo, cargandoCatalogo, errorCatalogo, cargarCatalogo,
    fecha, setFecha,
    notas, setNotas,
    filas, guardando, error, erroresFilas, focoValidacion, exito,
    actualizarFila, agregarFila, quitarFila,
    guardarEntrenamiento
  };
}
