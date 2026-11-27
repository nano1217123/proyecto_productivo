import assert from "node:assert/strict";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import express from "express";
import { parse } from "csv-parse/sync";

const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
let filas: { celdas: (string | null)[]; exceso: boolean }[] = [];
const consultar = mock.fn(async (_sql: { text: string; values: unknown[] }) => filas);
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma: { $queryRaw: consultar } },
});
mock.module(new URL("../src/middleware/auth.middleware.ts", import.meta.url).href, {
  namedExports: { requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.get("x-fixture") !== "titular") return res.sendStatus(401);
    req.userId = id;
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
const get = (path: string, auth = true) => fetch(`http://127.0.0.1:${address.port}/${path}`, {
  headers: auth ? { "x-fixture": "titular" } : {},
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
  filas = [{ celdas: ["2026-01-01", "=1+1", null, "1", "Sentadilla"], exceso: false }];
  const csv = await get("rutinas.csv");
  assert.equal(parse(await csv.text())[1][1], "[texto] =1+1");
  const pdf = await get("rutinas.pdf");
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.match(bytes.subarray(-32).toString(), /%%EOF/);
  filas[0].exceso = true;
  const res = await get("rutinas.pdf");
  assert.equal(res.status, 422);
  assert.equal(res.headers.get("content-disposition"), null);
});
