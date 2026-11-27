import assert from "node:assert/strict";
import { mock, test } from "node:test";

mock.module(new URL("../api/particularApi.js", import.meta.url).href, {
  namedExports: {
    obtenerMetricasHoy: () => { throw new Error("Usa el GET simulado de la prueba."); },
    guardarMetricasHoy: () => { throw new Error("Usa el POST simulado de la prueba."); },
  },
});

const { createDailyMetricsState } = await import("./useDailyMetrics.js");
const fila = { pesoActualKg: 73.5, vasosAgua: 4, entrenamientoCompletado: true };
const respuesta = (data) => ({ success: true, data });
const dia = "2026-11-25";
const diaNuevo = "2026-11-26";
const diario = (data, diaLocal = dia) => ({
  ...respuesta(data), capacidades: { actualizacionParcial: true }, diaLocal,
});
const cambioDeDia = () => Object.assign(new Error("Cambió el día"), {
  status: 409, body: { codigo: "DIA_METRICAS_CAMBIO", diaLocal: diaNuevo },
});

test("acepta data:null y envía el cuerpo completo sin capacidad parcial estricta", async () => {
  for (const capacidades of [undefined, { actualizacionParcial: false }, { actualizacionParcial: "true" }]) {
    const guardar = mock.fn(async () => respuesta(fila));
    const tracker = createDailyMetricsState({ cargar: async () => ({ ...respuesta(null), capacidades }), guardar });
    await tracker.guardarCambios();
    assert.equal(guardar.mock.callCount(), 0);
    await tracker.recargar();
    assert.equal(tracker.getSnapshot().puedeGuardar, false);
    await tracker.guardarCambios();
    assert.equal(guardar.mock.callCount(), 0);
    tracker.editar("weight", "73.5");
    await tracker.guardarCambios();
    assert.deepEqual(guardar.mock.calls[0].arguments, [
      { pesoActualKg: 73.5, vasosAgua: 0, entrenamientoCompletado: false },
    ]);
    assert.deepEqual(tracker.getSnapshot().habits, { weight: "73.5", water: 4, workoutDone: true });
  }
});

test("envía solo cambios efectivos y conserva cero y falso explícitos", async () => {
  const guardar = mock.fn(async () => respuesta({ ...fila, pesoActualKg: 75, vasosAgua: 0, entrenamientoCompletado: false }));
  const tracker = createDailyMetricsState({ cargar: async () => diario(fila), guardar });
  await tracker.recargar();
  tracker.editar("weight", "74");
  tracker.editar("weight", "73.50");
  assert.equal(tracker.getSnapshot().puedeGuardar, false);
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 0);
  tracker.editar("water", 0);
  tracker.editar("workoutDone", false);
  await tracker.guardarCambios();
  assert.equal(tracker.getSnapshot().diaLocal, dia);
  assert.deepEqual(guardar.mock.calls[0].arguments, [{ diaEsperado: dia, vasosAgua: 0, entrenamientoCompletado: false }]);
  assert.deepEqual(tracker.getSnapshot().habits, { weight: "75", water: 0, workoutDone: false });
  assert.equal(tracker.getSnapshot().puedeGuardar, false);
});

test("omite el peso inicialmente vacío en modo diario al editar otra métrica", async () => {
  const sinPeso = { ...fila, pesoActualKg: null };
  const guardar = mock.fn(async () => respuesta({ ...sinPeso, vasosAgua: 5 }));
  const tracker = createDailyMetricsState({ cargar: async () => diario(sinPeso), guardar });
  await tracker.recargar();
  assert.equal(tracker.getSnapshot().habits.weight, "");
  tracker.editar("water", 5);
  await tracker.guardarCambios();
  assert.deepEqual(guardar.mock.calls[0].arguments, [{ diaEsperado: dia, vasosAgua: 5 }]);
});

test("bloquea el guardado si se borra un peso confirmado y conserva el borrador", async () => {
  const guardar = mock.fn();
  const tracker = createDailyMetricsState({ cargar: async () => diario(fila), guardar });
  await tracker.recargar();
  tracker.editar("weight", "");
  tracker.editar("water", 5);
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 0);
  assert.deepEqual(tracker.getSnapshot().habits, { weight: "", water: 5, workoutDone: true });
  assert.equal(tracker.getSnapshot().mensaje.tipo, "error");
});

test("el cuerpo JSON del modo vigente omite el peso vacío y conserva agua y entrenamiento", async () => {
  const guardar = mock.fn(async (datos) => {
    assert.deepEqual(JSON.parse(JSON.stringify(datos)), { vasosAgua: 5, entrenamientoCompletado: true });
    return respuesta({ ...fila, pesoActualKg: null });
  });
  const tracker = createDailyMetricsState({ cargar: async () => respuesta(fila), guardar });
  await tracker.recargar();
  tracker.editar("weight", "");
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 0);
  tracker.editar("water", 5);
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 1);
  assert.equal(tracker.getSnapshot().mensaje.tipo, "exito");
});

test("bloquea el guardado tras una carga fallida y permite reintentar", async () => {
  const cargar = mock.fn(async () => diario(null));
  cargar.mock.mockImplementationOnce(async () => { throw new Error("Sin conexión"); });
  const guardar = mock.fn(async () => respuesta(fila));
  const tracker = createDailyMetricsState({ cargar, guardar });
  await tracker.recargar();
  assert.equal(tracker.getSnapshot().errorCarga, true);
  tracker.editar("water", 5);
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 0);
  await tracker.recargar();
  assert.equal(tracker.getSnapshot().errorCarga, false);
  tracker.editar("water", 4);
  await tracker.guardarCambios();
  assert.deepEqual(guardar.mock.calls[0].arguments, [{ diaEsperado: dia, vasosAgua: 4 }]);
});

test("conserva el borrador cuando falla el POST y permite volver a enviarlo", async () => {
  const guardar = mock.fn(async () => respuesta({ ...fila, vasosAgua: 6 }));
  guardar.mock.mockImplementationOnce(async () => { throw new Error("Error temporal"); });
  const tracker = createDailyMetricsState({ cargar: async () => diario(fila), guardar });
  await tracker.recargar();
  tracker.editar("water", 6);
  await tracker.guardarCambios();
  assert.equal(tracker.getSnapshot().habits.water, 6);
  assert.equal(tracker.getSnapshot().mensaje.tipo, "error");
  assert.equal(tracker.getSnapshot().puedeGuardar, true);
  await tracker.guardarCambios();
  assert.deepEqual(guardar.mock.calls.map(({ arguments: args }) => args), [
    [{ diaEsperado: dia, vasosAgua: 6 }], [{ diaEsperado: dia, vasosAgua: 6 }],
  ]);
  assert.equal(tracker.getSnapshot().mensaje.tipo, "exito");
});

test("ignora una respuesta de carga antigua tras un guardado más reciente", async () => {
  const anterior = Promise.withResolvers();
  const cargar = mock.fn(async () => diario(fila));
  cargar.mock.mockImplementationOnce(() => anterior.promise);
  const guardar = mock.fn(async () => respuesta({ ...fila, vasosAgua: 7 }));
  const tracker = createDailyMetricsState({ cargar, guardar });
  const cargaAnterior = tracker.recargar();
  await tracker.recargar();
  tracker.editar("water", 7);
  await tracker.guardarCambios();
  anterior.resolve(respuesta(null));
  await cargaAnterior;
  assert.equal(tracker.getSnapshot().habits.water, 7);
  assert.equal(tracker.getSnapshot().puedeGuardar, false);
});

test("bloquea ediciones y envíos repetidos mientras se confirma el POST", async () => {
  const pendiente = Promise.withResolvers();
  const guardar = mock.fn(() => pendiente.promise);
  const tracker = createDailyMetricsState({ cargar: async () => diario(fila), guardar });
  await tracker.recargar();
  tracker.editar("water", 5);
  const envio = tracker.guardarCambios();
  tracker.editar("water", 9);
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 1);
  assert.equal(tracker.getSnapshot().habits.water, 5);
  pendiente.resolve(respuesta({ ...fila, vasosAgua: 5 }));
  await envio;
});

test("bloquea el guardado si la capacidad diaria carece de una fecha real y válida", async () => {
  for (const diaLocal of [undefined, null, "2026-02-29", "2026-04-31", "2026-1-25", `${dia}T00:00:00Z`]) {
    const guardar = mock.fn();
    const tracker = createDailyMetricsState({ cargar: async () => ({ ...diario(fila), diaLocal }), guardar });
    await tracker.recargar();
    assert.equal(tracker.getSnapshot().errorCarga, true);
    assert.equal(tracker.getSnapshot().diaLocal, null);
    tracker.editar("water", 8);
    await tracker.guardarCambios();
    assert.equal(guardar.mock.callCount(), 0);
  }
});

test("el 409 conserva el borrador al consultar el nuevo día y permite descartarlo", async () => {
  const cargar = mock.fn(async () => diario(null, diaNuevo));
  cargar.mock.mockImplementationOnce(async () => diario(fila));
  const guardar = mock.fn(async () => { throw cambioDeDia(); });
  const tracker = createDailyMetricsState({ cargar, guardar });
  await tracker.recargar();
  tracker.editar("weight", "74");
  tracker.editar("water", 0);
  await tracker.guardarCambios();
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 1);
  assert.equal(tracker.getSnapshot().conflicto.diaInformado, diaNuevo);
  const borrador = tracker.getSnapshot().habits;
  await tracker.consultarNuevoDia();
  assert.deepEqual(tracker.getSnapshot().habits, borrador);
  assert.equal(tracker.getSnapshot().diaLocal, dia);
  tracker.resolverConflicto();
  assert.equal(tracker.getSnapshot().diaLocal, diaNuevo);
  assert.deepEqual(tracker.getSnapshot().habits, { weight: "", water: 0, workoutDone: false });
  assert.equal(tracker.getSnapshot().conflicto, null);
  await tracker.guardarCambios();
  assert.equal(guardar.mock.callCount(), 1);
});

test("aplica solo la selección sobre el día nuevo y espera un guardado explícito", async () => {
  const nuevaFila = { pesoActualKg: 80, vasosAgua: 7, entrenamientoCompletado: true };
  const cargar = mock.fn(async () => diario(nuevaFila, diaNuevo));
  cargar.mock.mockImplementationOnce(async () => diario(fila));
  const guardar = mock.fn(async () => respuesta({ ...nuevaFila, vasosAgua: 0, entrenamientoCompletado: false }));
  guardar.mock.mockImplementationOnce(async () => { throw cambioDeDia(); });
  const tracker = createDailyMetricsState({ cargar, guardar });
  await tracker.recargar();
  tracker.editar("weight", "74");
  tracker.editar("water", 0);
  tracker.editar("workoutDone", false);
  await tracker.guardarCambios();
  await tracker.consultarNuevoDia();
  tracker.resolverConflicto(["vasosAgua", "entrenamientoCompletado"]);
  assert.deepEqual(tracker.getSnapshot().habits, { weight: "80", water: 0, workoutDone: false });
  assert.equal(guardar.mock.callCount(), 1);
  await tracker.guardarCambios();
  assert.deepEqual(guardar.mock.calls[1].arguments, [
    { diaEsperado: diaNuevo, vasosAgua: 0, entrenamientoCompletado: false },
  ]);
});

test("la consulta tras el conflicto admite reintento e ignora respuestas fuera de orden", async () => {
  const atrasada = Promise.withResolvers();
  const cargar = mock.fn(async () => diario(null, diaNuevo));
  cargar.mock.mockImplementationOnce(async () => diario(fila));
  const guardar = mock.fn(async () => { throw cambioDeDia(); });
  const tracker = createDailyMetricsState({ cargar, guardar });
  await tracker.recargar();
  tracker.editar("water", 8);
  await tracker.guardarCambios();
  cargar.mock.mockImplementationOnce(async () => { throw new Error("Sin conexión"); });
  await tracker.consultarNuevoDia();
  assert.ok(tracker.getSnapshot().conflicto.error);
  assert.equal(tracker.getSnapshot().habits.water, 8);
  cargar.mock.mockImplementationOnce(() => atrasada.promise);
  const consultaAnterior = tracker.consultarNuevoDia();
  await tracker.consultarNuevoDia();
  tracker.resolverConflicto(["vasosAgua"]);
  atrasada.resolve(diario({ ...fila, vasosAgua: 1 }, "2026-11-27"));
  await consultaAnterior;
  assert.equal(tracker.getSnapshot().diaLocal, diaNuevo);
  assert.equal(tracker.getSnapshot().habits.water, 8);
  assert.equal(tracker.getSnapshot().conflicto, null);
});

// Regresión de «Mi progreso»: la vista solo edita el peso y nunca debe
// reemplazar los valores cargados de agua y entrenamiento.
test("modo anterior: cambiar solo el peso reenvía el agua y el entrenamiento cargados", async () => {
  const cargada = { pesoActualKg: 70, vasosAgua: 6, entrenamientoCompletado: true };
  const guardar = mock.fn(async (datos) => respuesta({ ...cargada, ...datos }));
  const tracker = createDailyMetricsState({ cargar: async () => respuesta(cargada), guardar });
  await tracker.recargar();
  tracker.editar("weight", "71.5");
  await tracker.guardarCambios();
  assert.deepEqual(guardar.mock.calls[0].arguments, [
    { pesoActualKg: 71.5, vasosAgua: 6, entrenamientoCompletado: true },
  ]);
  assert.deepEqual(tracker.getSnapshot().habits, { weight: "71.5", water: 6, workoutDone: true });
});

test("modo diario: cambiar solo el peso envía únicamente pesoActualKg y diaEsperado", async () => {
  const cargada = { pesoActualKg: 70, vasosAgua: 6, entrenamientoCompletado: true };
  const guardar = mock.fn(async (datos) => respuesta({ ...cargada, pesoActualKg: datos.pesoActualKg }));
  const tracker = createDailyMetricsState({ cargar: async () => diario(cargada), guardar });
  await tracker.recargar();
  tracker.editar("weight", "71.5");
  await tracker.guardarCambios();
  assert.deepEqual(guardar.mock.calls[0].arguments, [{ diaEsperado: dia, pesoActualKg: 71.5 }]);
  assert.deepEqual(tracker.getSnapshot().habits, { weight: "71.5", water: 6, workoutDone: true });
});
