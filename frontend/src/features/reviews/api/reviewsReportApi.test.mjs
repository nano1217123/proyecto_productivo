import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { crearDescargaResenas, obtenerReporteResenas } from "./reviewsReportApi.js";

test("las respuestas incompletas o inválidas no generan una descarga ni un aviso de éxito", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null));
  for (const [status, body] of [[204, null], [206, "%PDF-1.7"], [200, ""], [200, "texto plano"]]) {
    fetch.mock.mockImplementationOnce(async () => new Response(body, {
      status, headers: { "content-type": "application/pdf" },
    }));
    let guardado = false;
    const estados = [];
    const descarga = crearDescargaResenas({ guardar: () => { guardado = true; } });
    await descarga.iniciar({ gymSlug: "jj-poblado", formato: "pdf" }, s => estados.push(s.estado));
    assert.equal(guardado, false);
    assert.deepEqual(estados, ["cargando", "error"]);
  }
});

test("cancelar mientras se lee el archivo impide guardar o publicar éxito", async (t) => {
  let terminarLectura;
  let iniciarLectura;
  const leyendo = new Promise(resolve => { iniciarLectura = resolve; });
  let signal;
  t.mock.method(globalThis, "fetch", async (_url, opciones) => {
    signal = opciones.signal;
    const response = new Response("%PDF-1.7", { headers: { "content-type": "application/pdf" } });
    response.arrayBuffer = () => new Promise(resolve => {
      terminarLectura = resolve;
      iniciarLectura();
    });
    return response;
  });
  const estados = [];
  const descarga = crearDescargaResenas({ guardar: () => assert.fail("descarga cancelada") });
  const pendiente = descarga.iniciar({ gymSlug: "jj-poblado", formato: "pdf" }, s => estados.push(s.estado));
  await leyendo;
  descarga.cancelar();
  assert.equal(signal.aborted, true);
  terminarLectura(new TextEncoder().encode("%PDF-1.7").buffer);
  await pendiente;
  assert.deepEqual(estados, ["cargando"]);
});

test("descarga PDF y CSV del consolidado a través de la API y valida MIME y extensión", async (t) => {
  const peticiones = t.mock.method(globalThis, "fetch", async (_url, opciones) => {
    const mime = opciones.headers.Accept;
    return new Response(mime === "application/pdf" ? "%PDF-1.7" : "sede,fecha", {
      headers: { "content-type": mime, "content-disposition": 'attachment; filename="erroneo.exe"' },
    });
  });
  assert.equal((await obtenerReporteResenas({ alcance: "consolidado", formato: "pdf", gymSlug: "ignorada" })).nombre,
    "resenas-consolidado.pdf");
  assert.equal((await obtenerReporteResenas({ alcance: "consolidado", formato: "csv" })).nombre,
    "resenas-consolidado.csv");
  assert.equal((await obtenerReporteResenas({ gymSlug: "jj-poblado", formato: "pdf" })).nombre,
    "resenas-jj-poblado.pdf");
  assert.deepEqual(peticiones.mock.calls.map(c => c.arguments[0]), [
    "/api/resenas/reportes/consolidado.pdf",
    "/api/resenas/reportes/consolidado.csv",
    "/api/resenas/gimnasio/jj-poblado/reporte.pdf",
  ]);
  assert.ok(peticiones.mock.calls.every(c => c.arguments[1].credentials === "include"));
  peticiones.mock.mockImplementationOnce(async () => new Response("CSV", { headers: { "content-type": "text/csv" } }));
  await assert.rejects(obtenerReporteResenas({ alcance: "consolidado", formato: "pdf" }), /no devolvió un archivo PDF/);
});

test("ignora un PDF por sede resuelto después de cambiar al consolidado", async () => {
  const solicitudes = [];
  const archivos = [];
  const estados = [];
  const descarga = crearDescargaResenas({
    obtener: (filtros) => new Promise(resolve => solicitudes.push({ ...filtros, resolve })),
    guardar: (archivo) => archivos.push(archivo),
  });
  const anterior = descarga.iniciar({ alcance: "sede", gymSlug: "jj-poblado", formato: "pdf" }, s => estados.push(s));
  descarga.cancelar();
  const nueva = descarga.iniciar({ alcance: "consolidado", formato: "csv" }, s => estados.push(s));
  assert.equal(solicitudes[0].signal.aborted, true);
  solicitudes[1].resolve("consolidado");
  await nueva;
  solicitudes[0].resolve("viejo");
  await anterior;
  assert.deepEqual(archivos, ["consolidado"]);
  assert.equal(estados.filter(s => s.estado === "exito").length, 1);
});
import { pestanasAdmin, restaurarPestana } from "../../admin/lib/adminTabs.js";

test("conserva la navegación del PR #27 y restaura solo pestañas permitidas", () => {
  const admin = { esAdmin: true, esSuperAdmin: false };
  const superAdmin = { esAdmin: false, esSuperAdmin: true };
  const comun = { esAdmin: false, esSuperAdmin: false };
  const ids = (roles) => pestanasAdmin(roles).map(({ id }) => id);
  assert.deepEqual(ids(admin).slice(-2), ["reportes-resenas", "suscripcion"]);
  assert.deepEqual(ids(superAdmin).slice(-2), ["reportes-resenas", "crear-admin"]);
  assert.equal(ids(admin)[0], "clientes");
  assert.equal(ids(comun).includes("reportes-resenas"), false);
  for (const rol of [admin, superAdmin]) {
    assert.equal(restaurarPestana("reportes-resenas", rol), "reportes-resenas");
    assert.equal(restaurarPestana("miembros", rol), "clientes");
    assert.equal(restaurarPestana(null, rol), "clientes");
  }
  assert.equal(restaurarPestana("suscripcion", admin), "suscripcion");
  assert.equal(restaurarPestana("suscripcion", superAdmin), "clientes");
  assert.equal(restaurarPestana("crear-admin", superAdmin), "crear-admin");
  assert.equal(restaurarPestana("crear-admin", admin), "clientes");
  assert.equal(restaurarPestana("reportes-resenas", comun), "clientes");
});

const csv = "\uFEFFsede,fecha,calificacion,comentario\r\n";
const respuestaCsv = (disposition) => new Response(csv, {
  headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": disposition },
});

test("usa la sede solicitada, cookies y filtros opcionales, y conserva el BOM del CSV vacío", async (t) => {
  const peticiones = t.mock.method(globalThis, "fetch", async () => respuestaCsv('attachment; filename="seguro.csv"'));
  const poblado = await obtenerReporteResenas({ gymSlug: "jj-poblado" });
  const laureles = await obtenerReporteResenas({ gymSlug: "power-laureles", desde: "2024-02-29", hasta: "2024-02-29" });
  assert.equal(poblado.nombre, "seguro.csv");
  assert.equal(laureles.nombre, "seguro.csv");
  assert.deepEqual(new Uint8Array(await poblado.blob.arrayBuffer()), new TextEncoder().encode(csv));
  assert.deepEqual(peticiones.mock.calls.map(({ arguments: args }) => args[0]), [
    "/api/resenas/gimnasio/jj-poblado/reporte.csv",
    "/api/resenas/gimnasio/power-laureles/reporte.csv?desde=2024-02-29&hasta=2024-02-29",
  ]);
  assert.ok(peticiones.mock.calls.every(({ arguments: args }) => args[1].credentials === "include"));
});

test("rechaza ausencia de sede, fechas inválidas y rangos invertidos antes de llamar a la API", async (t) => {
  const peticiones = t.mock.method(globalThis, "fetch", async () => respuestaCsv(""));
  await assert.rejects(obtenerReporteResenas({}), /Selecciona una sede/);
  for (const filtros of [
    { desde: "2026-02-29" }, { hasta: "2026-4-01" }, { desde: "0000-01-01" },
    { desde: "2026-12-02", hasta: "2026-12-01" },
  ]) {
    await assert.rejects(obtenerReporteResenas({ gymSlug: "jj-poblado", ...filtros }), { status: 400 });
  }
  assert.equal(peticiones.mock.callCount(), 0);
});

test("acepta un nombre extendido seguro y reemplaza nombres inseguros", async (t) => {
  const peticiones = t.mock.method(globalThis, "fetch", async () => respuestaCsv('attachment; filename="../otro.csv"'));
  peticiones.mock.mockImplementationOnce(async () => respuestaCsv("attachment; filename*=UTF-8''reporte%2Dseguro.csv"));
  assert.equal((await obtenerReporteResenas({ gymSlug: "jj-poblado" })).nombre, "reporte-seguro.csv");
  assert.equal((await obtenerReporteResenas({ gymSlug: "jj-poblado" })).nombre, "resenas-jj-poblado.csv");
});

test("maneja los errores HTTP y una respuesta HTML sin descargarla", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("<html>", {
    headers: { "content-type": "text/html" },
  }));
  const guardar = mock.fn();
  const descarga = crearDescargaResenas({ guardar });
  for (const [status, texto] of [
    [400, /fechas/], [401, /sesión/], [403, /permiso/], [404, /sede/],
    [422, /rango/], [429, /límite/], [500, /Intenta de nuevo/],
  ]) {
    fetchMock.mock.mockImplementationOnce(async () => Response.json({ message: "Error del API" }, { status }));
    const estado = mock.fn();
    await descarga.iniciar({ gymSlug: "jj-poblado" }, estado);
    const [resultado] = estado.mock.calls.at(-1).arguments;
    assert.equal(resultado.estado, "error");
    assert.match(resultado.mensaje, texto);
  }
  await assert.rejects(obtenerReporteResenas({ gymSlug: "jj-poblado" }), /no devolvió un archivo CSV/);
  fetchMock.mock.mockImplementationOnce(async () => { throw new Error("offline"); });
  await assert.rejects(obtenerReporteResenas({ gymSlug: "jj-poblado" }), /conexión/);
  assert.equal(guardar.mock.callCount(), 0);
});

test("impide duplicados, conserva el destino capturado e ignora una respuesta anterior al cambiar de sede", async () => {
  const anterior = Promise.withResolvers();
  const obtener = mock.fn(async ({ gymSlug }) => ({ nombre: gymSlug + ".csv", blob: new Blob([csv]) }));
  obtener.mock.mockImplementationOnce(() => anterior.promise);
  const guardar = mock.fn();
  const descarga = crearDescargaResenas({ obtener, guardar });
  const estado = mock.fn();
  const original = descarga.iniciar({ gymSlug: "jj-poblado", desde: "2026-10-01" }, estado);
  await descarga.iniciar({ gymSlug: "jj-poblado" }, estado);
  assert.equal(obtener.mock.callCount(), 1);
  const [capturada] = obtener.mock.calls[0].arguments;
  assert.equal(capturada.desde, "2026-10-01");
  descarga.cancelar();
  assert.equal(capturada.signal.aborted, true);
  await descarga.iniciar({ gymSlug: "power-laureles" }, estado);
  anterior.resolve({ nombre: "jj-poblado.csv" });
  await original;
  assert.equal(guardar.mock.callCount(), 1);
  assert.equal(guardar.mock.calls[0].arguments[0].nombre, "power-laureles.csv");
});

test("cancelar al desmontar evita descargar o actualizar estado, incluso si el transporte ignora el aborto", async () => {
  const pendiente = Promise.withResolvers();
  const obtener = mock.fn(() => pendiente.promise);
  const guardar = mock.fn();
  const estado = mock.fn();
  const descarga = crearDescargaResenas({ obtener, guardar });
  const trabajo = descarga.iniciar({ gymSlug: "jj-poblado" }, estado);
  descarga.cancelar();
  pendiente.resolve({ nombre: "jj-poblado.csv" });
  await trabajo;
  assert.equal(obtener.mock.calls[0].arguments[0].signal.aborted, true);
  assert.equal(estado.mock.callCount(), 1);
  assert.equal(guardar.mock.callCount(), 0);
});
