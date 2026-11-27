import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { after, mock, test } from "node:test";
import express, { type Request, type Response } from "express";

const administrador = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const superAdmin = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const titular = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const secreto = "valor-sensible-de-prueba";
const eventos = mock.fn(async (_sql: TemplateStringsArray, ..._valores: unknown[]) => 1);
const consulta = mock.fn(async (sql: TemplateStringsArray | { text: string }, ...valores: unknown[]) => {
  if (!("text" in sql)) {
    return [{ estado: "ok", fila_id: "fixture", gym_slug: valores[0] ?? "jj-poblado",
      creado_en: new Date("2026-11-27T05:00:00Z"), calificacion: 4, comentario: secreto }];
  }
  if (sql.text.includes("public.miembros_sede")) return [{ estado: "ok", sede: "jj-poblado",
    alta: new Date("2026-11-27T05:00:00Z"), nombre: secreto }];
  return [{ estado: "ok", celdas: ["2026-11-27", secreto] }];
});

mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma: {
    $queryRaw: consulta, $executeRaw: eventos,
    usuario: { findUnique: async ({ where }: { where: { idusuario: string } }) => ({
      tipoUsuario: where.idusuario === superAdmin ? "super_admin" : where.idusuario === administrador ? "admin" : "cliente",
    }) },
    adminSede: { findUnique: async ({ where }: { where: { usuarioId_gymSlug: { gymSlug: string } } }) =>
      where.usuarioId_gymSlug.gymSlug === "jj-poblado" ? { id: "fixture" } : null },
  } },
});
mock.module(new URL("../src/middleware/auth.middleware.ts", import.meta.url).href, {
  namedExports: { requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const actor = req.get("x-fixture");
    if (!actor) return res.sendStatus(401);
    req.userId = actor;
    next();
  } },
});
const { auditarReporte, auditarArchivoGenerado } = await import("../src/middleware/auditoriaReportes.middleware.js");
const { errorHandler } = await import("../src/middleware/error.middleware.js");
const { default: resenas } = await import("../src/routes/resenas.routes.js");
const { default: personales } = await import("../src/routes/reportesPersonales.routes.js");
const { default: membresias } = await import("../src/routes/reportesMembresias.routes.js");
const servidor = express().use("/resenas", resenas).use("/personales", personales)
  .use("/membresias", membresias).use(errorHandler).listen(0, "127.0.0.1");
after(() => servidor.close());
await once(servidor, "listening");
const direccion = servidor.address();
assert.ok(direccion && typeof direccion !== "string");
const get = (ruta: string, actor?: string) => fetch(`http://127.0.0.1:${direccion.port}/${ruta}`, {
  headers: actor ? { "x-fixture": actor, cookie: secreto } : {},
});
const capturar = (desde: number) => eventos.mock.calls.slice(desde).map(({ arguments: [sql, ...valores] }) => {
  assert.match(sql.join("?"), /ON CONFLICT \(solicitud_id, evento\) DO NOTHING/);
  assert.doesNotMatch(JSON.stringify(valores), new RegExp(secreto));
  return valores;
});
const sincronizar = () => new Promise<void>(resolve => setImmediate(resolve));

test("todos los endpoints correlacionan archivo y respuesta con actor y alcance autorizado", async () => {
  for (const [ruta, actor, tipo, alcance, sede] of [
    ["resenas/gimnasio/jj-poblado/reporte", administrador, "resenas", "sede", "jj-poblado"],
    ["resenas/reportes/consolidado", superAdmin, "resenas", "consolidado", null],
    ["personales/progreso", titular, "progreso", "personal", null],
    ["personales/rutinas", titular, "rutinas", "personal", null],
    ["personales/ejercicios", titular, "ejercicios", "personal", null],
    ["membresias/sede/jj-poblado", administrador, "membresias", "sede", "jj-poblado"],
    ["membresias/consolidado", superAdmin, "membresias", "consolidado", null],
  ] as const) for (const formato of ["csv", "pdf"]) {
    const desde = eventos.mock.callCount();
    const respuesta = await get(`${ruta}.${formato}`, actor);
    assert.equal(respuesta.status, 200, ruta);
    const archivo = Buffer.from(await respuesta.arrayBuffer());
    assert.equal(archivo.subarray(0, formato === "pdf" ? 5 : 3).toString(formato === "pdf" ? "utf8" : "hex"),
      formato === "pdf" ? "%PDF-" : "efbbbf");
    await sincronizar();
    const [generado, finalizado, ...extras] = capturar(desde);
    assert.equal(extras.length, 0);
    assert.match(String(generado[0]), /^[a-f0-9-]{36}$/);
    for (const evento of [generado, finalizado]) {
      assert.deepEqual(evento.slice(0, 6), [generado[0], actor, tipo, formato, alcance, sede]);
      assert.ok(evento[6] instanceof Date);
    }
    assert.deepEqual(generado.slice(7), ["archivo_generado", "ok"]);
    assert.deepEqual(finalizado.slice(7), ["respuesta_finalizada", "ok"]);
  }
});

test("registra rechazos autenticados sin atribuir permiso ni confiar en valores del cliente", async () => {
  for (const [ruta, actor, status, resultado] of [
    ["resenas/gimnasio/power-laureles/reporte.csv", administrador, 403, "sin_permiso"],
    ["membresias/consolidado.pdf", administrador, 403, "sin_permiso"],
    ["personales/progreso.csv?actorId=" + secreto, titular, 400, "invalidacion"],
    ["personales/progreso.csv", undefined, 401, null],
  ] as const) {
    const desde = eventos.mock.callCount();
    const respuesta = await get(ruta, actor);
    assert.equal(respuesta.status, status);
    assert.equal(respuesta.headers.get("content-disposition"), null);
    await respuesta.arrayBuffer();
    await sincronizar();
    const registros = capturar(desde);
    assert.equal(registros.length, actor ? 1 : 0);
    if (actor) {
      assert.deepEqual(registros[0].slice(4, 6), [null, null]);
      assert.deepEqual(registros[0].slice(7), ["solicitud_rechazada", resultado]);
    }
  }
});

test("si falla el registro obligatorio devuelve 503 sin adjunto y sanea el error", async t => {
  const log = t.mock.method(console, "error", () => {});
  eventos.mock.mockImplementationOnce(async () => { throw new Error(secreto); });
  const desde = eventos.mock.callCount();
  const respuesta = await get("personales/progreso.csv", titular);
  assert.equal(respuesta.status, 503);
  assert.equal(respuesta.headers.get("content-disposition"), null);
  assert.doesNotMatch(await respuesta.text(), new RegExp(secreto));
  await sincronizar();
  assert.deepEqual(capturar(desde).at(-1)?.slice(7), ["error_generacion", "auditoria_no_disponible"]);
  assert.doesNotMatch(JSON.stringify(log.mock.calls.map(c => c.arguments)), new RegExp(secreto));
});

test("registra el fallo de generación y no crea un evento de archivo", async t => {
  t.mock.method(console, "error", () => {});
  consulta.mock.mockImplementationOnce(async () => { throw new Error(secreto); });
  const desde = eventos.mock.callCount();
  const respuesta = await get("personales/rutinas.pdf", titular);
  assert.equal(respuesta.status, 500);
  assert.equal(respuesta.headers.get("content-disposition"), null);
  assert.doesNotMatch(await respuesta.text(), new RegExp(secreto));
  await sincronizar();
  const registros = capturar(desde);
  assert.equal(registros.length, 1);
  assert.deepEqual(registros[0].slice(7), ["error_generacion", "error_interno"]);
});

test("registra un único terminal si la conexión cierra mientras se persiste la generación", async () => {
  const desde = eventos.mock.callCount();
  let completar!: (valor: number) => void;
  eventos.mock.mockImplementationOnce(() => new Promise(resolve => { completar = resolve; }));
  const respuesta = Object.assign(new EventEmitter(), {
    statusCode: 200, writableFinished: false, writableEnded: false, destroyed: false,
  });
  const req = { userId: titular, method: "GET" } as Request;
  const res = respuesta as unknown as Response;
  auditarReporte("progreso", "pdf")(req, res, () => {});
  const pendiente = auditarArchivoGenerado(res, { tipo: "personal" });
  respuesta.destroyed = true;
  respuesta.emit("close");
  respuesta.emit("finish");
  respuesta.emit("close");
  completar(1);
  assert.equal(await pendiente, false);
  await sincronizar();
  const registros = capturar(desde);
  assert.equal(registros.length, 2);
  assert.deepEqual(registros[1].slice(7), ["respuesta_interrumpida", "conexion_cerrada"]);
  assert.equal(registros[0][0], registros[1][0]);
});
