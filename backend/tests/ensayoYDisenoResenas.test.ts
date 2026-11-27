import assert from "node:assert/strict";
import { test } from "node:test";
import { endpoint, validarUrlEnsayo, verificarIdentidad } from "../src/dev/ensayo.js";
import { estadisticasResenas } from "../src/lib/resenasPdfDiseno.js";
import { generarPdfResenas } from "../src/lib/resenasPdf.js";

test("acepta exclusivamente el endpoint de ensayo y rechaza identidades distintas", () => {
  const url = (host: string, query = "sslmode=require") => `postgresql://${host}.example.neon.tech/neondb?${query}`;
  assert.equal(validarUrlEnsayo(url(endpoint), true), url(endpoint));
  assert.equal(validarUrlEnsayo(url(endpoint + "-pooler"), false), url(endpoint + "-pooler"));
  for (const destino of [
    url(endpoint + "-pooler"), url("ep-empty-cloud-b5u57zyh"), url(endpoint, "sslmode=disable"),
    url(endpoint, "sslmode=require&host=otro"), url(endpoint, "sslmode=require&sslmode=require"),
  ]) assert.throws(() => validarUrlEnsayo(destino, true));
  const identidad = { branch: "br-purple-glade-b5ckib57", db: "neondb", schema: "public", lectura: "on" };
  verificarIdentidad(identidad);
  assert.throws(() => verificarIdentidad({ ...identidad, branch: "br-lingering-unit-b51okymm" }));
  assert.throws(() => verificarIdentidad({ ...identidad, lectura: "off" }));
});

test("calcula la distribución y el promedio ponderado a partir de las reseñas", () => {
  const datos = estadisticasResenas([5, 1, 1, 1].map(calificacion => ({ calificacion })));
  assert.equal(datos.promedio, 2);
  assert.equal(datos.altas, 1);
  assert.deepEqual(datos.distribucion.map(d => d.cantidad), [1, 0, 0, 0, 3]);
  assert.deepEqual(datos.distribucion.map(d => d.proporcion), [0.25, 0, 0, 0, 0.75]);
  assert.equal(estadisticasResenas([]).promedio, null);
  assert.ok(estadisticasResenas([]).distribucion.every(d => d.proporcion === null));
});

test("genera reportes vacíos y pagina comentarios largos sin adjuntos parciales", async () => {
  const vacia = { slug: "fit-belen", nombre: "Fit Lab Belén", filas: [] };
  const sede = { slug: "jj-poblado", nombre: "JJ GYM El Poblado", filas: [{
    gym_slug: "jj-poblado", creado_en: new Date("2026-11-27T05:00:00Z"), calificacion: 5,
    comentario: ("Año, café y comillas.\n").repeat(110),
  }] };
  const pdf = await generarPdfResenas([sede, vacia], {}, true, 4 * 1024 * 1024);
  assert.ok(pdf);
  assert.match(pdf.toString("latin1"), /\/Count [2-9]/);
  assert.equal(await generarPdfResenas([sede], {}, false, 4 * 1024 * 1024, 1), null);
  const vacio = await generarPdfResenas([vacia], {}, false, 4 * 1024 * 1024);
  assert.equal(vacio?.subarray(0, 5).toString(), "%PDF-");
});
