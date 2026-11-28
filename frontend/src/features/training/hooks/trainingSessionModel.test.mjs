import assert from "node:assert/strict";
import test from "node:test";
import { changeMeasure, duration, historyReference, modes, repeatContent, sessionStats, validSet } from "./trainingSessionModel.js";

test("la validación cambia con el tipo y no mezcla tiempo y repeticiones de movilidad", () => {
  for (const [type, mode] of Object.entries(modes)) {
    assert.equal(validSet(type, {}), false);
    const values = Object.fromEntries(mode.fields.filter((key) => key !== "distancia_km").map((key) => [key, 1]));
    if (type === "movilidad") delete values.repeticiones;
    assert.equal(validSet(type, values), true, type);
  }
  const updated = changeMeasure({ duracion_seg: 30, completada: true }, "movilidad", "repeticiones", "8");
  assert.deepEqual(updated, { duracion_seg: null, repeticiones: 8, completada: true });
  assert.equal(changeMeasure(updated, "movilidad", "repeticiones", "").completada, false);
  assert.equal(changeMeasure(updated, "movilidad", "repeticiones", "-1"), updated);
});

test("el volumen cuenta solo series completadas de fuerza y repetir conserva la plantilla", () => {
  const ejercicios = [
    { tipo: "fuerza", descanso: 90, notas: "original", series: [
      { peso_kg: 12.5, repeticiones: 8, completada: true },
      { peso_kg: 20, repeticiones: 10, completada: false },
    ] },
    { tipo: "carga_adicional", series: [{ peso_kg: 30, repeticiones: 8, completada: true }] },
    { tipo: "asistido", series: [{ asistencia_kg: 30, repeticiones: 8, completada: true }] },
  ];
  const session = { sesion: { nombre: "Sesión", notas: "original", ejercicios } };
  assert.deepEqual(sessionStats(session.sesion), { exercises: 3, total: 4, done: 3, volume: 100 });
  const copy = repeatContent(session);
  assert.equal(copy.ejercicios[0].descanso, 90);
  assert.equal(copy.ejercicios[0].series[0].peso_kg, 12.5);
  assert.equal(copy.ejercicios[0].series[0].completada, false);
  assert.equal(session.sesion.ejercicios[0].series[0].completada, true);
  assert.equal(duration({ fecha: "2026-11-27" }), null);
});

test("la última referencia y el récord usan series del mismo tipo", () => {
  const history = [
    { fecha: "2026-11-27", series_entrenamiento: [
      { ejercicio_id: 1, tipo: "asistido", asistencia_kg: 30 },
      { ejercicio_id: 1, tipo: "fuerza", peso_kg: 20 },
    ] },
    { fecha: "2026-11-26", series_entrenamiento: [
      { ejercicio_id: 1, tipo: "fuerza", peso_kg: 25 },
      { ejercicio_id: 2, tipo: "fuerza", peso_kg: 50 },
    ] },
  ];
  const reference = historyReference(history, 1, "fuerza");
  assert.equal(reference.last.date, "2026-11-27");
  assert.equal(reference.last.series.length, 1);
  assert.equal(reference.best, 25);
  assert.deepEqual(historyReference(history, 3, "fuerza"), { last: undefined, best: null });
});
