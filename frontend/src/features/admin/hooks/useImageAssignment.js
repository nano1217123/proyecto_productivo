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
// equipo y, si aún coinciden, por el ID.
export function etiquetasEjercicios(ejercicios) {
  const conEquipo = (e) => (e.equipo ? `${e.nombre} (${e.equipo})` : e.nombre);
  return ejercicios.map((ejercicio) => {
    const mismosNombre = ejercicios.filter((e) => e.nombre === ejercicio.nombre);
    if (mismosNombre.length === 1) return { id: ejercicio.id, etiqueta: ejercicio.nombre };
    const etiqueta = conEquipo(ejercicio);
    const repetida = mismosNombre.filter((e) => conEquipo(e) === etiqueta).length > 1;
    return { id: ejercicio.id, etiqueta: repetida ? `${etiqueta} · ID ${ejercicio.id}` : etiqueta };
  });
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
  quitarImagen = (ejercicioId, imagenActual) => adminApi.removeExerciseImage(ejercicioId, imagenActual),
} = {}) {
  const listeners = new Set();
  let solicitudCatalogo = 0;
  let catalogoEnCurso = false;
  let operacion = 0;
  let operacionQuitar = 0;
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
    quitar: QUITAR_INICIAL,
  };

  function actualizar(cambios) {
    estado = { ...estado, ...cambios };
    for (const listener of listeners) listener();
  }

  const enviando = () => ENVIANDO.has(estado.fase);
  // Mientras se sube o se quita una imagen, la selección queda bloqueada.
  const ocupado = () => enviando() || estado.quitar.fase === "quitando";

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
    return { fase: "inactivo", errorEnvio: "", pendiente: null, destinoEnvio: null, quitar: QUITAR_INICIAL };
  }

  function seleccionarGrupo(grupoSlug) {
    if (ocupado()) return;
    actualizar({ grupoSlug: grupoSlug || "", ejercicioId: "", ...descartarOperacion() });
  }

  function seleccionarEjercicio(ejercicioId) {
    if (ocupado()) return;
    actualizar({ ejercicioId: ejercicioId ? String(ejercicioId) : "", ...descartarOperacion() });
  }

  function seleccionarArchivo(archivo) {
    if (ocupado()) return;
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
    if (ocupado() || !estado.archivo) return;
    const destino = destinoActual();
    if (!destino) return;
    const actual = ++operacion;
    const archivo = estado.archivo;
    actualizar({ fase: "subiendo", errorEnvio: "", pendiente: null, destinoEnvio: destino, quitar: QUITAR_INICIAL });
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

  // Abre la confirmación con la imagen que el administrador está viendo.
  // No se ofrece mientras hay una subida en curso o una asignación pendiente
  // de reintento, para no mezclar las dos operaciones.
  function pedirQuitar() {
    if (ocupado() || estado.fase === "error-asignacion") return;
    const destino = destinoActual();
    const ejercicio = destino && buscarEjercicio(estado.grupos, destino.ejercicioId);
    if (!ejercicio?.imagen_url) return;
    actualizar({ quitar: {
      ...QUITAR_INICIAL, fase: "confirmando", destino, imagenVista: ejercicio.imagen_url,
      compartidaCon: ejerciciosConImagen(estado.grupos, ejercicio.imagen_url, ejercicio.id),
    } });
  }

  // Cancelar no envía nada al servidor.
  function cancelarQuitar() {
    if (estado.quitar.fase === "confirmando") actualizar({ quitar: QUITAR_INICIAL });
  }

  async function confirmarQuitar() {
    const peticion = estado.quitar;
    if (peticion.fase !== "confirmando") return;
    const actual = ++operacionQuitar;
    const { ejercicioId } = peticion.destino;
    actualizar({ quitar: { ...peticion, fase: "quitando" } });
    try {
      await quitarImagen(ejercicioId, peticion.imagenVista);
      if (actual !== operacionQuitar) return;
      actualizar({ grupos: conImagen(estado.grupos, ejercicioId, null), quitar: { ...peticion, fase: "exito" } });
    } catch (err) {
      if (actual !== operacionQuitar) return;
      if (err?.status === 409) {
        // Otro administrador la cambió: el panel muestra la imagen vigente.
        const vigente = typeof err.body?.imagenUrl === "string" ? err.body.imagenUrl : null;
        actualizar({
          grupos: conImagen(estado.grupos, ejercicioId, vigente),
          quitar: { ...peticion, fase: "conflicto", imagenVigente: vigente, mensaje: err.message },
        });
        return;
      }
      const mensaje = err?.status === 404
        ? "Este ejercicio ya no existe en el catálogo. Recarga la página para ver el catálogo actual."
        : err?.message || "No se pudo quitar la imagen.";
      actualizar({ quitar: { ...peticion, fase: "error", mensaje } });
    }
  }

  function cancelar() {
    solicitudCatalogo++;
    catalogoEnCurso = false;
    operacion++;
    operacionQuitar++;
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
    pedirQuitar,
    cancelarQuitar,
    confirmarQuitar,
    cancelar,
  };
}

// Estado de «Quitar imagen».
// fase: inactivo | confirmando | quitando | exito | conflicto | error
const QUITAR_INICIAL = {
  fase: "inactivo",
  destino: null, // { ejercicioId, ejercicioNombre, grupoNombre }
  imagenVista: "", // URL que se mostró al pedir la confirmación
  compartidaCon: [], // otros ejercicios con la misma imagen
  imagenVigente: null, // tras un 409, la imagen que hay en el servidor
  mensaje: "",
};

function buscarEjercicio(grupos, ejercicioId) {
  for (const g of grupos) {
    const ejercicio = (g.ejercicios || []).find((e) => e.id === ejercicioId);
    if (ejercicio) return ejercicio;
  }
  return null;
}

// Cambia la imagen de un único ejercicio en el catálogo cargado.
function conImagen(grupos, ejercicioId, imagenUrl) {
  return grupos.map((g) => ({
    ...g,
    ejercicios: (g.ejercicios || []).map((e) => (e.id === ejercicioId ? { ...e, imagen_url: imagenUrl } : e)),
  }));
}

// Otros ejercicios del catálogo que usan la misma imagen, para avisar en la
// confirmación de que la conservan.
export function ejerciciosConImagen(grupos, imagenUrl, excluirId) {
  if (!imagenUrl) return [];
  return grupos.flatMap((g) => (g.ejercicios || [])
    .filter((e) => e.imagen_url === imagenUrl && e.id !== excluirId)
    .map((e) => ({ id: e.id, nombre: e.nombre, grupoNombre: g.nombre })));
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
    quitando: estado.quitar.fase === "quitando",
    pedirQuitar: controlador.pedirQuitar,
    cancelarQuitar: controlador.cancelarQuitar,
    confirmarQuitar: controlador.confirmarQuitar,
  };
}
