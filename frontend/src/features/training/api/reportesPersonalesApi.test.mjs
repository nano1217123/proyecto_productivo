import assert from "node:assert/strict";
import { test } from "node:test";
import { obtenerReportePersonal } from "./reportesPersonalesApi.js";
import { crearDescargaResenas } from "../../reviews/api/reviewsReportApi.js";

test("informa cada rechazo 422 sin guardar un archivo ni mostrar éxito", async t => {
  const mensajes = ["No hay datos suficientes.", "Un campo supera el tamaño permitido.", "El conjunto de datos supera el tamaño permitido."];
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json(
    { message: mensajes.shift() }, { status: 422 },
  ));
  const guardados = [];
  const descarga = crearDescargaResenas({ obtener: obtenerReportePersonal, guardar: archivo => guardados.push(archivo) });
  for (const mensaje of [...mensajes]) {
    const estados = [];
    await descarga.iniciar({ tipo: "progreso", formato: "pdf", desde: "2026-01-01" }, estado => estados.push(estado));
    assert.deepEqual(estados, [{ estado: "cargando" }, { estado: "error", mensaje }]);
  }
  assert.deepEqual(guardados, []);
  assert.ok(fetch.mock.calls.every(({ arguments: [url, opciones] }) =>
    url === "/api/reportes/personales/progreso.pdf?desde=2026-01-01" && opciones.credentials === "include"));
});

test("usa un mensaje genérico si 422 no devuelve JSON", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("inválido", { status: 422 }));
  await assert.rejects(obtenerReportePersonal({ tipo: "rutinas", formato: "csv", signal: new AbortController().signal }),
    /No se pudo generar el reporte para este período/);
});
