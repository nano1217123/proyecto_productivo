import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accionSuscripcion,
  estadoSuscripcion,
  explicacionVigencia,
  formatearCop,
  formatearFechaColombia,
} from "./payments.js";

const sinEspacios = (texto) => texto.replace(/\s/g, " ");

test("el importe de la sede con la tasa de prueba 4000 se muestra como $600.000", () => {
  assert.equal(sinEspacios(formatearCop(150_00 * 4000)), "$ 600.000");
});

test("botón «Pagar» o «Renovar» según el estado de la sede", () => {
  assert.equal(accionSuscripcion({ estado: "activa" }), "Renovar");
  assert.equal(accionSuscripcion({ estado: "vencida" }), "Pagar");
  assert.equal(accionSuscripcion({ estado: "sin_suscripcion" }), "Pagar");
  assert.equal(accionSuscripcion(undefined), "Pagar");
  assert.deepEqual(["activa", "vencida", "sin_suscripcion", "otro"].map((e) => estadoSuscripcion({ estado: e }).etiqueta),
    ["Activa", "Vencida", "Sin suscripción", "Sin suscripción"]);
});

test("las fechas se muestran en hora de Colombia", () => {
  // 1 mar 04:30 UTC = 28 feb 23:30 en Colombia.
  const texto = sinEspacios(formatearFechaColombia("2027-03-01T04:30:00.000Z"));
  assert.match(texto, /28 de febrero de 2027/);
  assert.match(texto, /11:30/);
  assert.equal(formatearFechaColombia(null), null);
  assert.equal(formatearFechaColombia("no es fecha"), null);
});

test("la confirmación explica desde cuándo cuenta el mes", () => {
  const activa = explicacionVigencia({ estado: "activa", vigente_hasta: "2027-03-01T04:30:00.000Z" });
  assert.match(activa, /vigente hasta el 28 de febrero de 2027.*; si Wompi aprueba el pago, se suma un mes desde ese vencimiento\.$/);
  const vencida = explicacionVigencia({ estado: "vencida", vigente_hasta: "2026-02-15T15:00:00.000Z" });
  assert.match(vencida, /venció el 15 de febrero de 2026.*desde la aprobación/);
  // La fecha termina en «a. m.» o «p. m.»: el texto no añade otro punto.
  for (const texto of [activa, vencida]) assert.doesNotMatch(texto, /\.\./);
  assert.match(explicacionVigencia({ estado: "sin_suscripcion", vigente_hasta: null }), /un mes desde la aprobación/);
});
