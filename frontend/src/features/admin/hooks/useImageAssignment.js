"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { adminApi } from "../api/adminApi.js";
import { exercisesApi } from "../../exercises/api/exercisesApi.js";

// Mismo límite que multer en backend/src/routes/imagenes.routes.ts. El
// backend acepta cualquier tipo MIME image/*.
export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024;

export function validarArchivoImagen(archivo) {
  if (!archivo) return "";
  if (!archivo.type?.startsWith("image/")) return "El archivo debe ser una imagen (JPG, PNG, WebP…).";
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) return "La imagen supera el límite de 5 MB.";
  return "";
}

// Nombres legibles; si se repiten dentro del grupo se distinguen por el
// equipo y, si aún coinciden, por el ID. Cada opción conserva su equipo
// para la búsqueda, aunque no aparezca en la etiqueta.
export function etiquetasEjercicios(ejercicios) {
  const conEquipo = (e) => (e.equipo ? `${e.nombre} (${e.equipo})` : e.nombre);
  return ejercicios.map((ejercicio) => {
    const base = { id: ejercicio.id, equipo: ejercicio.equipo || "" };
    const mismosNombre = ejercicios.filter((e) => e.nombre === ejercicio.nombre);
    if (mismosNombre.length === 1) return { ...base, etiqueta: ejercicio.nombre, equipoVisible: false };
    const etiqueta = conEquipo(ejercicio);
    const repetida = mismosNombre.filter((e) => conEquipo(e) === etiqueta).length > 1;
    return {
      ...base,
      etiqueta: repetida ? `${etiqueta} · ID ${ejercicio.id}` : etiqueta,
      equipoVisible: Boolean(ejercicio.equipo),
    };
  });
}

// Texto de la opción en el selector. Mientras se busca, añade el equipo si
// la etiqueta no lo muestra, para que se entienda por qué coincide.
export function textoOpcion(opcion, buscando = false) {
  return buscando && opcion.equipo && !opcion.equipoVisible ? `${opcion.etiqueta} · ${opcion.equipo}` : opcion.etiqueta;
}

// Minúsculas y sin tildes, para buscar «press inclinado» o «muneca».
export function normalizarBusqueda(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Filtra las opciones del grupo por nombre (la etiqueta) y por equipo, se
// muestre o no en la etiqueta. Solo filtra: nunca elige un ejercicio. El
// ejercicio ya seleccionado se conserva visible aunque no coincida, para
// que el selector siga mostrando el destino confirmado.
export function filtrarOpciones(opciones, termino, idSeleccionado = "") {
  const buscado = normalizarBusqueda(termino);
  if (!buscado) return { visibles: opciones, coincidencias: opciones.length, seleccionFuera: false };
  const coinciden = opciones.filter((o) => normalizarBusqueda(`${o.etiqueta} ${o.equipo ?? ""}`).includes(buscado));
  const seleccionada = opciones.find((o) => String(o.id) === String(idSeleccionado));
  const seleccionFuera = Boolean(seleccionada) && !coinciden.includes(seleccionada);
  return {
    visibles: seleccionFuera ? [seleccionada, ...coinciden] : coinciden,
    coincidencias: coinciden.length,
    seleccionFuera,
  };
}

const ENVIANDO = new Set(["subiendo", "asignando"]);

/**
 * Estado de la pestaña «Subir imágenes».
 *
 * El destino (grupo y ejercicio) se fija al iniciar el envío: la subida
 * (POST) y la asignación (PATCH) usan ese destino aunque la vista cambie.
 * Mientras se envía, la selección queda bloqueada. Tras un fallo, cambiar el
 * grupo, el ejercicio o el archivo descarta la operación pendiente (incluida
 * la URL ya subida), de modo que un reintento nunca asigna a otro ejercicio.
 */
export function createImageAssignmentState({
  cargarCatalogo = () => exercisesApi.getExerciseCatalog(),
  subir = (archivo) => adminApi.uploadImage(archivo),
  asignar = (ejercicioId, url) => adminApi.assignImageToExercise(ejercicioId, url),
} = {}) {
  const listeners = new Set();
  let solicitudCatalogo = 0;
  let catalogoEnCurso = false;
  let operacion = 0;
  let estado = {
    estadoCatalogo: "cargando",
    errorCatalogo: "",
    grupos: [],
    grupoSlug: "",
    ejercicioId: "",
    archivo: null,
    errorArchivo: "",
    fase: "inactivo", // inactivo | subiendo | asignando | error-subida | error-asignacion | exito
    errorEnvio: "",
    pendiente: null, // { url, destino } tras subir con éxito
    destinoEnvio: null, // { ejercicioId, ejercicioNombre, grupoNombre }
  };

  function actualizar(cambios) {
    estado = { ...estado, ...cambios };
    for (const listener of listeners) listener();
  }

  const enviando = () => ENVIANDO.has(estado.fase);

  async function recargarCatalogo() {
    if (catalogoEnCurso) return;
    catalogoEnCurso = true;
    const actual = ++solicitudCatalogo;
    actualizar({ estadoCatalogo: "cargando" });
    try {
      const grupos = await cargarCatalogo();
      if (actual !== solicitudCatalogo) return;
      actualizar({ grupos: Array.isArray(grupos) ? grupos : [], estadoCatalogo: "listo", errorCatalogo: "" });
    } catch (err) {
      if (actual !== solicitudCatalogo) return;
      actualizar({ estadoCatalogo: "error", errorCatalogo: err?.message || "No se pudo cargar el catálogo de ejercicios." });
    } finally {
      if (actual === solicitudCatalogo) catalogoEnCurso = false;
    }
  }

  // Cualquier cambio de destino o archivo descarta el resultado anterior.
  function descartarOperacion() {
    operacion++;
    return { fase: "inactivo", errorEnvio: "", pendiente: null, destinoEnvio: null };
  }

  function seleccionarGrupo(grupoSlug) {
    if (enviando()) return;
    actualizar({ grupoSlug: grupoSlug || "", ejercicioId: "", ...descartarOperacion() });
  }

  function seleccionarEjercicio(ejercicioId) {
    if (enviando()) return;
    actualizar({ ejercicioId: ejercicioId ? String(ejercicioId) : "", ...descartarOperacion() });
  }

  function seleccionarArchivo(archivo) {
    if (enviando()) return;
    const errorArchivo = validarArchivoImagen(archivo);
    actualizar({ archivo: archivo && !errorArchivo ? archivo : null, errorArchivo, ...descartarOperacion() });
  }

  function destinoActual() {
    const grupo = estado.grupos.find((g) => g.slug === estado.grupoSlug);
    const ejercicio = grupo?.ejercicios?.find((e) => String(e.id) === estado.ejercicioId);
    if (!grupo || !ejercicio) return null;
    const etiqueta = etiquetasEjercicios(grupo.ejercicios).find((o) => o.id === ejercicio.id)?.etiqueta;
    return { ejercicioId: ejercicio.id, ejercicioNombre: etiqueta || ejercicio.nombre, grupoNombre: grupo.nombre };
  }

  async function asignarPendiente(actual, url, destino) {
    actualizar({ fase: "asignando", errorEnvio: "", pendiente: { url, destino }, destinoEnvio: destino });
    try {
      await asignar(destino.ejercicioId, url);
      if (actual !== operacion) return;
      // Refleja la nueva imagen en el catálogo cargado.
      const grupos = estado.grupos.map((g) => ({
        ...g,
        ejercicios: (g.ejercicios || []).map((e) => (e.id === destino.ejercicioId ? { ...e, imagen_url: url } : e)),
      }));
      actualizar({ grupos, fase: "exito", pendiente: null, archivo: null, errorArchivo: "" });
    } catch (err) {
      if (actual !== operacion) return;
      actualizar({
        fase: "error-asignacion",
        errorEnvio: err?.message || "No se pudo asignar la imagen al ejercicio.",
      });
    }
  }

  async function enviar() {
    if (enviando() || !estado.archivo) return;
    const destino = destinoActual();
    if (!destino) return;
    const actual = ++operacion;
    const archivo = estado.archivo;
    actualizar({ fase: "subiendo", errorEnvio: "", pendiente: null, destinoEnvio: destino });
    let url;
    try {
      const respuesta = await subir(archivo);
      url = respuesta?.url;
      if (typeof url !== "string" || !url) throw new Error("El servidor no devolvió la URL de la imagen.");
    } catch (err) {
      if (actual !== operacion) return;
      actualizar({ fase: "error-subida", errorEnvio: err?.message || "No se pudo subir la imagen." });
      return;
    }
    if (actual !== operacion) return;
    await asignarPendiente(actual, url, destino);
  }

  // Repite solo el PATCH con la URL y el destino de la operación fallida.
  async function reintentarAsignacion() {
    if (estado.fase !== "error-asignacion" || !estado.pendiente) return;
    const { url, destino } = estado.pendiente;
    const actual = ++operacion;
    await asignarPendiente(actual, url, destino);
  }

  function cancelar() {
    solicitudCatalogo++;
    catalogoEnCurso = false;
    operacion++;
  }

  return {
    getSnapshot: () => estado,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    recargarCatalogo,
    seleccionarGrupo,
    seleccionarEjercicio,
    seleccionarArchivo,
    enviar,
    reintentarAsignacion,
    cancelar,
  };
}

export function useImageAssignment() {
  const [controlador] = useState(createImageAssignmentState);
  const estado = useSyncExternalStore(controlador.subscribe, controlador.getSnapshot, controlador.getSnapshot);

  useEffect(() => {
    controlador.recargarCatalogo();
    return controlador.cancelar;
  }, [controlador]);

  return {
    ...estado,
    enviando: ENVIANDO.has(estado.fase),
    recargarCatalogo: controlador.recargarCatalogo,
    seleccionarGrupo: controlador.seleccionarGrupo,
    seleccionarEjercicio: controlador.seleccionarEjercicio,
    seleccionarArchivo: controlador.seleccionarArchivo,
    enviar: controlador.enviar,
    reintentarAsignacion: controlador.reintentarAsignacion,
  };
}
