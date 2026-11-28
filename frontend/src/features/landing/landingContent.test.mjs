import assert from "node:assert/strict";
import test from "node:test";
import { CATALOGO_PLANES } from "../../../../backend/src/lib/pagosPrecios.ts";
import { SEDES } from "../../../../backend/src/lib/sedes.ts";
import { gyms, plans } from "./content.mjs";

test("los planes públicos mantienen los precios y periodos del catálogo de pagos", () => {
  assert.deepEqual(Object.fromEntries(plans.map(({ id, price, period }) => [
    id, { precioUsdCentavos: price, periodo: period },
  ])), CATALOGO_PLANES);
});

test("las sedes públicas reflejan el catálogo y preservan los parámetros de entrada", () => {
  assert.deepEqual(gyms.map(({ name, location }) => [name, location]), SEDES.map(({ nombre, ubicacion }) => [nombre, ubicacion]));
  assert.deepEqual(gyms.map(({ slug }) => slug), ["jj-poblado", "power-laureles", "fit-belén"]);
});
