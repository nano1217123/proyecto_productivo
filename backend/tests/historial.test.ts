import assert from "node:assert/strict";
import { test } from "node:test";
import { volumenRegistrado } from "../src/service/volumenEntrenamiento.js";
import { diferencia } from "../src/service/compararEntrenamientos.js";

test("volumen en kg por repetición de series válidas y completadas", () => {
  const series = [
    { completada: true, peso_kg: 60, repeticiones: 12 },
    { completada: true, peso_kg: 65, repeticiones: 10 },
    { completada: true, peso_kg: 70, repeticiones: 8 },
    { completada: false, peso_kg: 80, repeticiones: 20 },
  ];
  assert.equal(volumenRegistrado(series, "fuerza"), 1930);
  assert.equal(volumenRegistrado(series, "carga_adicional"), 1930);
  assert.equal(volumenRegistrado(series, "asistido"), null);
  assert.equal(volumenRegistrado(series, "cardio"), null);
  assert.equal(volumenRegistrado(series.slice(-1), "fuerza"), null);
});

test("la comparación calcula porcentajes solo con una referencia válida", () => {
  assert.deepEqual(diferencia(80, 100), { anterior: 80, reciente: 100, cambio: 20, porcentaje: 25 });
  assert.deepEqual(diferencia(0, 8), { anterior: 0, reciente: 8, cambio: 8, porcentaje: null });
  assert.deepEqual(diferencia(null, 8), { anterior: null, reciente: 8, cambio: null, porcentaje: null });
});
