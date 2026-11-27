import assert from "node:assert/strict";
import { mock, test } from "node:test";

mock.module(new URL("../api/adminApi.js", import.meta.url).href, {
  namedExports: { adminApi: { uploadImage: () => { throw new Error("Usa la subida simulada."); }, assignImageToExercise: () => { throw new Error("Usa la asignación simulada."); } } },
});
mock.module(new URL("../../exercises/api/exercisesApi.js", import.meta.url).href, {
  namedExports: { exercisesApi: { getExerciseCatalog: () => { throw new Error("Usa el catálogo simulado."); } } },
});

const { createImageAssignmentState, etiquetasEjercicios, validarArchivoImagen, TAMANO_MAXIMO_IMAGEN } = await import("./useImageAssignment.js");

const GRUPOS = [
  { slug: "pecho", nombre: "Pecho", ejercicios: [{ id: 1, nombre: "Press banca", imagen_url: "https://img.test/vieja.jpg" }, { id: 2, nombre: "Aperturas", imagen_url: null }] },
  { slug: "piernas", nombre: "Piernas", ejercicios: [{ id: 7, nombre: "Sentadilla", imagen_url: null }] },
];
const archivo = (nombre = "foto.png", type = "image/png", size = 1000) => ({ name: nombre, type, size });
function diferida() {
  let resolve; let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const esperar = () => new Promise((r) => setImmediate(r));

async function preparado(opciones = {}) {
  const subir = opciones.subir || mock.fn(async () => ({ url: "https://img.test/nueva.jpg" }));
  const asignar = opciones.asignar || mock.fn(async () => ({}));
  const c = createImageAssignmentState({ cargarCatalogo: async () => structuredClone(GRUPOS), subir, asignar });
  await c.recargarCatalogo();
  return { c, subir, asignar };
}

test("valida formato y tamaño antes de enviar", () => {
  assert.equal(validarArchivoImagen(archivo()), "");
  assert.match(validarArchivoImagen(archivo("a.pdf", "application/pdf")), /imagen/);
  assert.match(validarArchivoImagen(archivo("g.png", "image/png", TAMANO_MAXIMO_IMAGEN + 1)), /5 MB/);
  assert.equal(validarArchivoImagen(archivo("l.png", "image/png", TAMANO_MAXIMO_IMAGEN)), "");
});

test("cambiar de grupo limpia el ejercicio y nunca se envía el ID anterior", async () => {
  const { c, subir, asignar } = await preparado();
  c.seleccionarGrupo("pecho");
  c.seleccionarEjercicio("1");
  c.seleccionarGrupo("piernas");
  assert.equal(c.getSnapshot().ejercicioId, "");
  c.seleccionarArchivo(archivo());
  await c.enviar();
  assert.equal(subir.mock.callCount(), 0, "sin ejercicio no se sube nada");
  c.seleccionarEjercicio("7");
  c.seleccionarArchivo(archivo());
  await c.enviar();
  assert.deepEqual(asignar.mock.calls.map((x) => x.arguments), [[7, "https://img.test/nueva.jpg"]]);
});

test("seleccionar o rechazar archivos no escribe; clics repetidos producen un solo POST y un PATCH", async () => {
  const { c, subir, asignar } = await preparado();
  c.seleccionarGrupo("pecho");
  c.seleccionarEjercicio("1");
  c.seleccionarArchivo(archivo("x.gif", "text/plain"));
  assert.equal(c.getSnapshot().archivo, null);
  c.seleccionarArchivo(archivo());
  c.seleccionarArchivo(null);
  c.seleccionarArchivo(archivo());
  assert.equal(subir.mock.callCount() + asignar.mock.callCount(), 0);
  await Promise.all([c.enviar(), c.enviar(), c.enviar()]);
  assert.equal(subir.mock.callCount(), 1);
  assert.deepEqual(asignar.mock.calls.map((x) => x.arguments), [[1, "https://img.test/nueva.jpg"]]);
  const estado = c.getSnapshot();
  assert.equal(estado.fase, "exito");
  assert.equal(estado.grupos[0].ejercicios[0].imagen_url, "https://img.test/nueva.jpg");
  assert.equal(estado.destinoEnvio.ejercicioNombre, "Press banca");
});

test("si falla la subida no se asigna y se conservan selección y archivo", async () => {
  const subir = mock.fn(async () => { throw new Error("fallo de subida"); });
  const { c, asignar } = await preparado({ subir });
  c.seleccionarGrupo("pecho");
  c.seleccionarEjercicio("2");
  const f = archivo();
  c.seleccionarArchivo(f);
  await c.enviar();
  const estado = c.getSnapshot();
  assert.equal(estado.fase, "error-subida");
  assert.equal(asignar.mock.callCount(), 0);
  assert.equal(estado.archivo, f);
  assert.equal(estado.ejercicioId, "2");
});

test("si falla la asignación, el reintento repite solo el PATCH al mismo destino", async () => {
  let fallar = true;
  const asignar = mock.fn(async () => { if (fallar) throw new Error("fallo de asignación"); });
  const { c, subir } = await preparado({ asignar });
  c.seleccionarGrupo("pecho");
  c.seleccionarEjercicio("2");
  c.seleccionarArchivo(archivo());
  await c.enviar();
  assert.equal(c.getSnapshot().fase, "error-asignacion");
  assert.deepEqual(c.getSnapshot().pendiente, {
    url: "https://img.test/nueva.jpg", destino: { ejercicioId: 2, ejercicioNombre: "Aperturas", grupoNombre: "Pecho" },
  });
  fallar = false;
  await Promise.all([c.reintentarAsignacion(), c.reintentarAsignacion()]);
  assert.equal(subir.mock.callCount(), 1);
  assert.deepEqual(asignar.mock.calls.map((x) => x.arguments), [[2, "https://img.test/nueva.jpg"], [2, "https://img.test/nueva.jpg"]]);
  assert.equal(c.getSnapshot().fase, "exito");
});

test("cambiar destino o archivo tras un fallo descarta la URL pendiente", async () => {
  for (const cambio of ["grupo", "ejercicio", "archivo"]) {
    const asignar = mock.fn(async () => { throw new Error("fallo de asignación"); });
    const { c, subir } = await preparado({ asignar });
    c.seleccionarGrupo("pecho");
    c.seleccionarEjercicio("2");
    c.seleccionarArchivo(archivo());
    await c.enviar();
    if (cambio === "grupo") { c.seleccionarGrupo("piernas"); c.seleccionarEjercicio("7"); }
    if (cambio === "ejercicio") c.seleccionarEjercicio("1");
    if (cambio === "archivo") c.seleccionarArchivo(archivo("otra.png"));
    assert.equal(c.getSnapshot().pendiente, null, cambio);
    await c.reintentarAsignacion();
    assert.equal(asignar.mock.callCount(), 1, `${cambio}: el reintento ya no asigna la URL anterior`);
    if (cambio !== "archivo") c.seleccionarArchivo(archivo("otra.png"));
    await c.enviar();
    assert.equal(subir.mock.callCount(), 2, `${cambio}: la nueva operación vuelve a subir`);
    const destino = asignar.mock.calls[1].arguments[0];
    assert.equal(destino, cambio === "grupo" ? 7 : cambio === "ejercicio" ? 1 : 2, cambio);
  }
});

test("durante el envío la selección queda bloqueada y se usa el destino confirmado", async () => {
  const d = diferida();
  const subir = mock.fn(() => d.promise);
  const { c, asignar } = await preparado({ subir });
  c.seleccionarGrupo("pecho");
  c.seleccionarEjercicio("1");
  c.seleccionarArchivo(archivo());
  const envio = c.enviar();
  c.seleccionarGrupo("piernas");
  c.seleccionarEjercicio("7");
  c.seleccionarArchivo(null);
  assert.equal(c.getSnapshot().grupoSlug, "pecho");
  assert.equal(c.getSnapshot().ejercicioId, "1");
  d.resolve({ url: "https://img.test/nueva.jpg" });
  await envio;
  assert.deepEqual(asignar.mock.calls.map((x) => x.arguments), [[1, "https://img.test/nueva.jpg"]]);
});

test("el catálogo tiene carga, error con reintento sin duplicados y respuesta obsoleta descartada", async () => {
  let intento = 0;
  const pendientes = [];
  const c = createImageAssignmentState({
    cargarCatalogo: mock.fn(() => { intento++; const d = diferida(); pendientes.push(d); return d.promise; }),
  });
  c.recargarCatalogo();
  c.recargarCatalogo();
  assert.equal(intento, 1);
  pendientes[0].reject(new Error("sin red"));
  await esperar();
  assert.equal(c.getSnapshot().estadoCatalogo, "error");
  c.recargarCatalogo();
  c.cancelar();
  pendientes[1].resolve(GRUPOS);
  await esperar();
  assert.equal(c.getSnapshot().estadoCatalogo, "cargando", "la respuesta tras desmontar se descarta");
});

test("los nombres repetidos se distinguen por equipo y el destino confirmado usa esa etiqueta", async () => {
  const ejercicios = [
    { id: 4, nombre: "Remo", equipo: "Barra" },
    { id: 5, nombre: "Remo", equipo: "Mancuerna" },
    { id: 6, nombre: "Remo", equipo: "Mancuerna" },
    { id: 9, nombre: "Dominadas", equipo: null },
  ];
  assert.deepEqual(etiquetasEjercicios(ejercicios).map((o) => o.etiqueta), [
    "Remo (Barra)", "Remo (Mancuerna) · ID 5", "Remo (Mancuerna) · ID 6", "Dominadas",
  ]);
  const asignar = mock.fn(async () => { throw new Error("fallo"); });
  const c = createImageAssignmentState({
    cargarCatalogo: async () => [{ slug: "espalda", nombre: "Espalda", ejercicios }],
    subir: async () => ({ url: "https://img.test/r.jpg" }),
    asignar,
  });
  await c.recargarCatalogo();
  c.seleccionarGrupo("espalda");
  c.seleccionarEjercicio("6");
  c.seleccionarArchivo(archivo());
  await c.enviar();
  assert.equal(c.getSnapshot().destinoEnvio.ejercicioNombre, "Remo (Mancuerna) · ID 6");
  assert.deepEqual(asignar.mock.calls[0].arguments, [6, "https://img.test/r.jpg"]);
});
