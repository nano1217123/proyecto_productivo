import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcularPeriodoSede,
  diaDelMesEnColombia,
  estadoSuscripcionSede,
  sumarMesCalendario,
} from "../src/lib/suscripcionSede.js";

// Fechas escritas en hora de Colombia (UTC−5) para que se lean como en el panel.
const co = (local: string) => new Date(`${local}-05:00`);
const iso = (d: Date) => d.toISOString();

test("un mes calendario conserva el día y la hora de Colombia", () => {
  assert.equal(iso(sumarMesCalendario(co("2026-11-28T10:15:00"), 28)), iso(co("2026-12-28T10:15:00")));
  assert.equal(iso(sumarMesCalendario(co("2026-12-15T08:00:00"), 15)), iso(co("2027-01-15T08:00:00")), "cambio de año");
});

test("finales de mes: vence el último día si el mes no tiene el día de corte", () => {
  assert.equal(iso(sumarMesCalendario(co("2027-01-31T15:00:00"), 31)), iso(co("2027-02-28T15:00:00")));
  assert.equal(iso(sumarMesCalendario(co("2028-01-31T15:00:00"), 31)), iso(co("2028-02-29T15:00:00")), "año bisiesto");
  assert.equal(iso(sumarMesCalendario(co("2027-03-31T09:00:00"), 31)), iso(co("2027-04-30T09:00:00")));
  assert.equal(iso(sumarMesCalendario(co("2027-01-30T09:00:00"), 30)), iso(co("2027-02-28T09:00:00")));
});

test("el día de corte se conserva al renovar: 31 ene → 28 feb → 31 mar → 30 abr → 31 may", () => {
  let vence = co("2027-01-31T15:00:00");
  const vencimientos = [];
  for (let i = 0; i < 4; i++) {
    vence = sumarMesCalendario(vence, 31);
    vencimientos.push(iso(vence));
  }
  assert.deepEqual(vencimientos, [
    iso(co("2027-02-28T15:00:00")), iso(co("2027-03-31T15:00:00")),
    iso(co("2027-04-30T15:00:00")), iso(co("2027-05-31T15:00:00")),
  ]);
});

test("la zona horaria es la de Colombia aunque en UTC ya sea otro día", () => {
  // 31 ene 23:30 en Colombia = 1 feb 04:30 UTC.
  const aprobado = co("2027-01-31T23:30:00");
  assert.equal(aprobado.getUTCDate(), 1);
  assert.equal(diaDelMesEnColombia(aprobado), 31);
  const periodo = calcularPeriodoSede({ vigenteHasta: null, diaCorte: null }, aprobado);
  assert.equal(periodo.diaCorte, 31);
  assert.equal(iso(periodo.hasta), "2027-03-01T04:30:00.000Z", "28 feb 23:30 en Colombia");
});

test("primer pago, renovación anticipada y sede vencida", () => {
  const aprobado = co("2026-11-28T10:00:00");
  const primero = calcularPeriodoSede({ vigenteHasta: null, diaCorte: null }, aprobado);
  assert.deepEqual([primero.tipo, iso(primero.desde), iso(primero.hasta), primero.diaCorte],
    ["activacion", iso(aprobado), iso(co("2026-12-28T10:00:00")), 28]);

  // Renovación anticipada el 20 dic: cuenta desde el vencimiento (28 dic).
  const renovacion = calcularPeriodoSede({ vigenteHasta: primero.hasta, diaCorte: 28 }, co("2026-12-20T18:00:00"));
  assert.deepEqual([renovacion.tipo, iso(renovacion.desde), iso(renovacion.hasta), renovacion.diaCorte],
    ["renovacion", iso(co("2026-12-28T10:00:00")), iso(co("2027-01-28T10:00:00")), 28]);

  // Pago el 5 feb con la sede vencida desde el 28 ene: cuenta desde el pago.
  const vencida = calcularPeriodoSede({ vigenteHasta: renovacion.hasta, diaCorte: 28 }, co("2027-02-05T12:00:00"));
  assert.deepEqual([vencida.tipo, iso(vencida.desde), iso(vencida.hasta), vencida.diaCorte],
    ["reactivacion", iso(co("2027-02-05T12:00:00")), iso(co("2027-03-05T12:00:00")), 5]);

  // Aprobado justo en el vencimiento: la sede ya no está vigente.
  const enElLimite = calcularPeriodoSede({ vigenteHasta: primero.hasta, diaCorte: 28 }, primero.hasta);
  assert.equal(enElLimite.tipo, "reactivacion");
});

test("estado de la sede según su vencimiento", () => {
  const ahora = co("2026-11-28T12:00:00");
  assert.equal(estadoSuscripcionSede(null, ahora), "sin_suscripcion");
  assert.equal(estadoSuscripcionSede(co("2026-11-28T12:00:01"), ahora), "activa");
  assert.equal(estadoSuscripcionSede(co("2026-11-28T12:00:00"), ahora), "vencida");
  assert.throws(() => sumarMesCalendario(ahora, 0), RangeError);
});
