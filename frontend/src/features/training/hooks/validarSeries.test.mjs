import assert from "node:assert/strict";
import { test } from "node:test";
import { validarSeries } from "./validarSeries.js";

const catalogo = [{ ejercicios: [{ id: 1 }] }];
const vacia = { id: "vacia", ejercicioId: "", repeticiones: "", pesoKg: "" };
const valida = { id: "primera", ejercicioId: "1", repeticiones: "12", pesoKg: "" };
const incompleta = { id: "segunda", ejercicioId: "1", repeticiones: "", pesoKg: "10" };

test("una serie incompleta impide preparar cualquier serie para guardar", () => {
  const { errores, series } = validarSeries([vacia, valida, incompleta], catalogo);
  assert.deepEqual(errores, { segunda: "Ingresa las repeticiones de esta serie." });
  assert.deepEqual(series, []);
});

test("al corregir la serie se conservan peso y numeración, y se omite la fila vacía", () => {
  const { errores, series } = validarSeries([vacia, valida, { ...incompleta, repeticiones: "8" }], catalogo);
  assert.deepEqual(errores, {});
  assert.deepEqual(series, [
    { ejercicio_id: 1, numero_serie: 1, repeticiones: 12, peso_kg: null },
    { ejercicio_id: 1, numero_serie: 2, repeticiones: 8, peso_kg: 10 },
  ]);
});

test("marca las series con ejercicios ausentes o retirados del catálogo", () => {
  const { errores, series } = validarSeries([
    { ...valida, ejercicioId: "" },
    { ...incompleta, ejercicioId: "2" },
  ], catalogo);
  assert.deepEqual(Object.keys(errores), ["primera", "segunda"]);
  assert.deepEqual(series, []);
});
