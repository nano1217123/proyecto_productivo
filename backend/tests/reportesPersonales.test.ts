import assert from "node:assert/strict";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import express from "express";
import { parse } from "csv-parse/sync";

const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const otroId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const sesiones = new Map([["titular", id], ["limites", otroId],
  ["compatibilidad", "cccccccc-cccc-4ccc-accc-cccccccccccc"]]);
let filas: { estado: string; celdas: (string | null)[] | null }[] = [];
const consultar = mock.fn(async (_sql: { text: string; values: unknown[] }) => filas);
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma: { $queryRaw: consultar, $executeRaw: async () => 1 } },
});
mock.module(new URL("../src/middleware/auth.middleware.ts", import.meta.url).href, {
  namedExports: { requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const usuario = sesiones.get(req.get("x-fixture") ?? "");
    if (!usuario) return res.sendStatus(401);
    req.userId = usuario;
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
  const celdas = {
    progreso: ["2026-01-01", null, "false"],
    rutinas: ["2026-01-01", "Rutina", null, "1", "Sentadilla", null, "Activa"],
    ejercicios: ["2026-01-01", "Sentadilla", "1", "5", "20", null, null, null, null],
  };
  for (const [tipo, alias] of [["progreso", "m"], ["rutinas", "r"], ["ejercicios", "t"]] as const) {
    filas = [{ estado: "ok", celdas: celdas[tipo] }];
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
  filas = [{ estado: "ok", celdas: ["2026-01-01", "=1+1", null, "1", "Sentadilla", null, "Activa"] }];
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

test("ejercicios exige sesión finalizada, consulta el nombre histórico y conserva las cinco columnas al inicio", async () => {
  filas = [
    { estado: "ok", celdas: ["2026-01-01", "Nombre histórico", "1", "8", "42.5", "carga", null, null, null] },
    { estado: "ok", celdas: ["2026-01-01", "Nombre actual de una sesión antigua", "2", null, null, "cardio", "300", "1.2", null] },
    { estado: "ok", celdas: ["2026-01-01", "Dominada", "3", "5", null, "asistido", null, null, "0"] },
  ];
  const respuesta = await get("ejercicios.csv?desde=2026-01-01&hasta=2026-01-01", true, "compatibilidad");
  assert.equal(respuesta.status, 200);
  const csv = parse(await respuesta.text());
  assert.deepEqual(csv[0], [
    "Fecha", "Ejercicio", "Serie", "Repeticiones", "Peso (kg)", "Tipo", "Duración (s)", "Distancia (km)", "Asistencia (kg)",
  ]);
  assert.deepEqual(csv.slice(1), filas.map(fila => fila.celdas?.map(valor => valor ?? "")));
  const sql = consultar.mock.calls.at(-1)!.arguments[0];
  assert.match(sql.text, /t\.estado = 'finalizado'/);
  assert.match(sql.text, /t\.catalogo_historico -> \(s\.ejercicio_id::text\) -> 'nombre'/);
  assert.match(sql.text, /jsonb_typeof\(captura.historico\) = 'string'[\s\S]+ELSE e.nombre END/);
  assert.match(sql.text, /s\.asistencia_kg::text/);
  assert.match(sql.text, /s\.distancia_km::text/);
  assert.match(sql.text, /s\.duracion_seg::text/);
  assert.match(sql.text, /t\.fecha >= \$\d+::date[\s\S]+t\.fecha <= \$\d+::date/);
  assert.equal((await get("ejercicios.pdf", true, "compatibilidad")).status, 200);
});

test("rutinas conserva las columnas antiguas y distingue días semanales y estados sin omitir las vacías", async () => {
  filas = [
    { estado: "ok", celdas: ["2026-01-01", "Plan semanal", "Día histórico", "1", "Prensa", "Lunes, Miércoles, Domingo", "Archivada"] },
    { estado: "ok", celdas: ["2026-01-01", "Sin ejercicios", null, null, null, null, "Activa"] },
  ];
  const respuesta = await get("rutinas.csv", true, "compatibilidad");
  assert.equal(respuesta.status, 200);
  const csv = parse(await respuesta.text());
  assert.deepEqual(csv[0], ["Fecha de creación", "Rutina", "Día", "Orden", "Ejercicio", "Días planificados", "Estado"]);
  assert.deepEqual(csv.slice(1), filas.map(fila => fila.celdas?.map(valor => valor ?? "")));
  const { text } = consultar.mock.calls.at(-1)!.arguments[0];
  assert.match(text, /LEFT JOIN public.rutina_ejercicios/);
  assert.match(text, /string_agg\(d.nombre, ', ' ORDER BY d.numero\)/);
  assert.match(text, /d.numero = ANY\(r.dias\)/);
  assert.match(text, /CASE WHEN r.archivada THEN 'Archivada' ELSE 'Activa' END/);
});

test("progreso conserva el día de Bogotá derivado de fecha y cada cuenta usa exclusivamente su sesión", async () => {
  filas = [{ estado: "ok", celdas: ["2026-01-01", null, "false"] }];
  for (const fixture of ["compatibilidad", "limites"]) {
    const respuesta = await get("progreso.csv?desde=2026-01-01&hasta=2026-01-01", true, fixture);
    assert.equal(respuesta.status, 200);
    assert.deepEqual(parse(await respuesta.text())[1], ["2026-01-01", "", "false"]);
    const { text, values } = consultar.mock.calls.at(-1)!.arguments[0];
    assert.match(text, /\(m.fecha AT TIME ZONE 'America\/Bogota'\)::date >= \$\d+::date/);
    assert.match(text, /\(m.fecha AT TIME ZONE 'America\/Bogota'\)::date <= \$\d+::date/);
    assert.doesNotMatch(text, /dia_local/);
    assert.equal(values[0], sesiones.get(fixture));
  }
});
