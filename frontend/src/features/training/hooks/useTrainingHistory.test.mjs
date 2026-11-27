import assert from "node:assert/strict";
import { mock, test } from "node:test";

mock.module(new URL("../api/trainingApi.js", import.meta.url).href, {
  namedExports: {
    trainingApi: {
      getTrainingHistory: () => { throw new Error("Usa el historial simulado de la prueba."); },
      getExerciseHistory: () => { throw new Error("Usa el progreso simulado de la prueba."); },
    },
  },
});

const { createTrainingHistoryState } = await import("./useTrainingHistory.js");

// Promesa controlable desde la prueba para fijar el orden de llegada.
function diferida() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const esperar = () => new Promise((r) => setImmediate(r));
const sesion = { id: "s1", fecha: "2026-11-20", notas: null, series_entrenamiento: [] };
const puntosA = [{ fecha: "2026-11-01", peso_max: 40 }];
const puntosB = [{ fecha: "2026-11-02", peso_max: 80 }];

function conProgreso() {
  const pendientes = new Map();
  const cargarProgreso = mock.fn((id) => {
    const d = diferida();
    pendientes.set(id, [...(pendientes.get(id) || []), d]);
    return d.promise;
  });
  return { cargarProgreso, pendiente: (id, n = 0) => pendientes.get(id)[n] };
}

test("el historial vacío solo se declara tras una respuesta exitosa y el error tiene reintento propio", async () => {
  const cargarHistorial = mock.fn(async () => { throw new Error("No se pudo cargar el historial de entrenamientos."); });
  const cargarProgreso = mock.fn(async () => []);
  const historial = createTrainingHistoryState({ cargarHistorial, cargarProgreso });
  await historial.recargarHistorial();
  let estado = historial.getSnapshot();
  assert.equal(estado.estadoHistorial, "error");
  assert.equal(estado.errorHistorial, "No se pudo cargar el historial de entrenamientos.");
  assert.deepEqual(estado.sesiones, []);

  cargarHistorial.mock.mockImplementation(async () => []);
  await historial.recargarHistorial();
  estado = historial.getSnapshot();
  assert.equal(estado.estadoHistorial, "listo");
  assert.equal(estado.errorHistorial, "");
  assert.equal(cargarHistorial.mock.callCount(), 2);
  assert.equal(cargarProgreso.mock.callCount(), 0);
});

test("reintentar el historial durante una carga no duplica la petición", async () => {
  const d = diferida();
  const cargarHistorial = mock.fn(() => d.promise);
  const historial = createTrainingHistoryState({ cargarHistorial });
  historial.recargarHistorial();
  historial.recargarHistorial();
  historial.recargarHistorial();
  assert.equal(cargarHistorial.mock.callCount(), 1);
  d.resolve([sesion]);
  await esperar();
  assert.deepEqual(historial.getSnapshot().sesiones, [sesion]);
});

test("A responde después de B: se conserva B (éxito y fallo tardío de A)", async () => {
  for (const finalA of ["exito", "fallo"]) {
    const { cargarProgreso, pendiente } = conProgreso();
    const historial = createTrainingHistoryState({ cargarHistorial: async () => [sesion], cargarProgreso });
    historial.seleccionarEjercicio("1");
    historial.seleccionarEjercicio("2");
    pendiente(2).resolve(puntosB);
    await esperar();
    if (finalA === "exito") pendiente(1).resolve(puntosA);
    else pendiente(1).reject(new Error("fallo de A"));
    await esperar();
    const estado = historial.getSnapshot();
    assert.equal(estado.ejercicioId, "2", finalA);
    assert.deepEqual(estado.progreso, puntosB, finalA);
    assert.equal(estado.estadoProgreso, "listo", finalA);
    assert.equal(estado.errorProgreso, "", finalA);
  }
});

test("limpiar la selección durante una consulta descarta su respuesta o su error", async () => {
  for (const final of ["exito", "fallo"]) {
    const { cargarProgreso, pendiente } = conProgreso();
    const historial = createTrainingHistoryState({ cargarProgreso });
    historial.seleccionarEjercicio("1");
    historial.seleccionarEjercicio("");
    if (final === "exito") pendiente(1).resolve(puntosA);
    else pendiente(1).reject(new Error("fallo de A"));
    await esperar();
    assert.deepEqual(historial.getSnapshot(), {
      ...historial.getSnapshot(),
      ejercicioId: "", progreso: [], estadoProgreso: "inactivo", errorProgreso: "",
    }, final);
  }
});

test("si falla B no quedan puntos de A, y el reintento solo pide B una vez", async () => {
  const { cargarProgreso, pendiente } = conProgreso();
  const historial = createTrainingHistoryState({ cargarHistorial: async () => [sesion], cargarProgreso });
  await historial.recargarHistorial();
  historial.seleccionarEjercicio("1");
  pendiente(1).resolve(puntosA);
  await esperar();
  historial.seleccionarEjercicio("2");
  assert.deepEqual(historial.getSnapshot().progreso, []);
  pendiente(2).reject(new Error("No se pudo cargar el historial de este ejercicio."));
  await esperar();
  let estado = historial.getSnapshot();
  assert.equal(estado.estadoProgreso, "error");
  assert.deepEqual(estado.progreso, []);
  assert.deepEqual(estado.sesiones, [sesion]);

  historial.reintentarProgreso();
  historial.reintentarProgreso();
  assert.deepEqual(cargarProgreso.mock.calls.map((c) => c.arguments[0]), [1, 2, 2]);
  assert.equal(historial.getSnapshot().ejercicioId, "2");
  pendiente(2, 1).resolve(puntosB);
  await esperar();
  estado = historial.getSnapshot();
  assert.deepEqual(estado.progreso, puntosB);
  assert.equal(estado.errorProgreso, "");
});

test("reintentar el mismo ejercicio descarta la respuesta anterior y desmontar descarta todo", async () => {
  const { cargarProgreso, pendiente } = conProgreso();
  const historial = createTrainingHistoryState({ cargarProgreso });
  historial.seleccionarEjercicio("2");
  historial.seleccionarEjercicio("2");
  pendiente(2, 1).resolve(puntosB);
  await esperar();
  pendiente(2, 0).reject(new Error("respuesta vieja"));
  await esperar();
  assert.deepEqual(historial.getSnapshot().progreso, puntosB);
  assert.equal(historial.getSnapshot().errorProgreso, "");

  const d = diferida();
  const otro = createTrainingHistoryState({ cargarHistorial: () => d.promise, cargarProgreso });
  otro.recargarHistorial();
  otro.seleccionarEjercicio("3");
  const antes = otro.getSnapshot();
  otro.cancelar();
  d.resolve([sesion]);
  pendiente(3).resolve(puntosA);
  await esperar();
  assert.equal(otro.getSnapshot(), antes);
});
