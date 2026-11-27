import assert from "node:assert/strict";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import express from "express";
import { parse } from "csv-parse/sync";

const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
let filas: { estado: string; celdas: (string | null)[] | null }[] = [
  { estado: "ok", celdas: ["2026-01-01", "Sentadilla", "1"] },
];
const consultar = mock.fn(async (_sql: { text: string; values: unknown[] }) => filas);
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma: { $queryRaw: consultar, $executeRaw: async () => 1 } },
});
mock.module(new URL("../src/middleware/auth.middleware.ts", import.meta.url).href, {
  namedExports: { requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const fixture = req.get("x-fixture");
    if (fixture !== "titular" && fixture !== "limites") return res.sendStatus(401);
    req.userId = fixture === "titular" ? id : "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
    next();
  } },
});
const { default: router } = await import("../src/routes/reportesPersonales.routes.js");
const { errorHandler } = await import("../src/middleware/error.middleware.js");
const app = express().use(router).use(errorHandler);
const server = app.listen(0, "127.0.0.1");
after(() => server.close());
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const get = (path: string, auth = true, fixture = "titular") => fetch(`http://127.0.0.1:${address.port}/${path}`, {
  headers: auth ? { "x-fixture": fixture } : {},
});

test("exige sesión y rechaza identidad, sede y fechas manipuladas antes de consultar", async () => {
  assert.equal((await get("progreso.csv", false)).status, 401);
  for (const q of ["usuarioId=otro", "gymSlug=otra", "desde=2025-02-30", "desde=2026-01-02&hasta=2026-01-01"]) {
    assert.equal((await get("progreso.csv?" + q)).status, 400);
  }
  assert.equal(consultar.mock.callCount(), 0);
});

test("parametriza el titular y las fechas en los tres reportes", async () => {
  for (const [tipo, alias] of [["progreso", "m"], ["rutinas", "r"], ["ejercicios", "t"]]) {
    const res = await get(`${tipo}.csv?desde=2026-01-01&hasta=2026-01-02`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 3).toString("hex"), "efbbbf");
    const sql = consultar.mock.calls.at(-1)!.arguments[0];
    assert.match(sql.text, new RegExp(alias + "\\.usuario_id = \\$1::uuid"));
    assert.ok(sql.values.includes(id) && sql.values.includes("2026-01-01") && sql.values.includes("2026-01-02"));
    assert.doesNotMatch(sql.text, /nutrition|nutricion|dia_local|admin_sedes/);
    if (tipo === "ejercicios") assert.match(sql.text, /s.usuario_id = t.usuario_id/);
    else assert.match(sql.text, /America\/Bogota/);
  }
});

test("exporta texto seguro y un PDF completo, sin entregar adjuntos fuera de límite", async () => {
  filas = [{ estado: "ok", celdas: ["2026-01-01", "=1+1", null, "1", "Sentadilla"] }];
  const csv = await get("rutinas.csv");
  assert.equal(parse(await csv.text())[1][1], "[texto] =1+1");
  const pdf = await get("rutinas.pdf");
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.match(bytes.subarray(-32).toString(), /%%EOF/);
  filas = [{ estado: "campo", celdas: null }];
  const res = await get("rutinas.pdf");
  assert.equal(res.status, 422);
  assert.equal(res.headers.get("content-disposition"), null);
  assert.match((await res.json()).message, /Un campo/);
});

test("aplica presupuestos en SQL y distingue filas, bytes y falta de datos sin enviar un adjunto", async () => {
  for (const [estado, formato, mensaje] of [
    ["filas", "csv", /cantidad máxima de filas/],
    ["bytes", "pdf", /conjunto de datos/],
    ["sin_datos", "csv", /No hay datos suficientes/],
    ["sin_datos", "pdf", /No hay datos suficientes/],
  ] as const) {
    filas = [{ estado, celdas: null }];
    const respuesta = await get(`progreso.${formato}`, true, "limites");
    assert.equal(respuesta.status, 422);
    assert.equal(respuesta.headers.get("content-disposition"), null);
    assert.match((await respuesta.json()).message, mensaje);
    const { text, values } = consultar.mock.calls.at(-1)!.arguments[0];
    assert.match(text, /octet_length\(valor\)/);
    assert.match(text, /LEFT JOIN candidatas c ON r.estado = 'ok'/);
    const maxFilas = formato === "pdf" ? 500 : 5000;
    assert.deepEqual(values.slice(-3), [maxFilas + 1, maxFilas, (formato === "pdf" ? 1 : 8) * 1024 * 1024]);
  }
});
