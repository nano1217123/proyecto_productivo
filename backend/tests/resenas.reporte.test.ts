import assert from "node:assert/strict";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import { parse } from "csv-parse/sync";
import express, { type RequestHandler } from "express";
import { AppError } from "../src/errors/AppError.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import { generarCsvResenas } from "../src/lib/resenasCsv.js";
import type { FilaReporteResenas } from "../src/types/resenas.types.js";

const roles = new Map([
  ["admin-a", "admin"], ["super", "super_admin"], ["cliente", "cliente"],
  ["particular", "usuario_particular"], ["limite", "super_admin"], ["frecuencia", "super_admin"],
  ["admin-revocado", "admin"],
]);
const asignaciones = new Set(["admin-a:jj-poblado", "admin-a:power-laureles", "admin-revocado:jj-poblado"]);
const buscarRol = mock.fn(async ({ where }: { where: { idusuario: string } }) => {
  const tipoUsuario = roles.get(where.idusuario);
  return tipoUsuario ? { tipoUsuario } : null;
});
const buscarAsignacion = mock.fn(async ({ where }: {
  where: { usuarioId_gymSlug: { usuarioId: string; gymSlug: string } };
}) => {
  const { usuarioId, gymSlug } = where.usuarioId_gymSlug;
  return asignaciones.has(`${usuarioId}:${gymSlug}`) ? { id: "asignacion" } : null;
});
const estadoConsulta = (estado: string) => ({
  estado, fila_id: null, gym_slug: null, creado_en: null, calificacion: null, comentario: null,
});
const conFilas = (filas: FilaReporteResenas[]) =>
  filas.map((fila, i) => ({ ...fila, estado: "ok", fila_id: String(i) }));
type ResultadoConsulta = ReturnType<typeof estadoConsulta> | ReturnType<typeof conFilas>[number];
const consultaReporte = mock.fn(async (
  _strings: TemplateStringsArray, ...values: unknown[]
): Promise<ResultadoConsulta[]> => {
  const [sede, admin] = values;
  return [estadoConsulta(admin && !asignaciones.has(`${admin}:${sede}`) ? "sin_permiso" : "ok")];
});

const auth: RequestHandler = (req, _res, next) => {
  const usuario = req.get("x-usuario-sintetico");
  if (!usuario) return next(new AppError(401, "No autorizado."));
  req.userId = usuario;
  next();
};
mock.module(new URL("../src/middleware/auth.middleware.ts", import.meta.url).href, {
  namedExports: { requireAuth: auth },
});
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma: {
    usuario: { findUnique: buscarRol },
    adminSede: { findUnique: buscarAsignacion },
    $queryRaw: consultaReporte,
  } },
});

const { default: router } = await import("../src/routes/resenas.routes.js");
const app = express();
app.use("/api/resenas", router);
app.use(errorHandler);
const servidor = app.listen(0, "127.0.0.1");
after(() => servidor.close());
await once(servidor, "listening");
const direccion = servidor.address();
assert.ok(direccion && typeof direccion === "object");
const base = `http://127.0.0.1:${direccion.port}/api/resenas/gimnasio`;

function descargar(usuario?: string, sede = "jj-poblado", query = "") {
  return fetch(`${base}/${sede}/reporte.csv${query}`, {
    headers: usuario ? { "x-usuario-sintetico": usuario } : {},
  });
}

const fila = {
  gym_slug: "jj-poblado",
  creado_en: new Date("2026-11-26T04:59:59.999Z"),
  calificacion: 1,
  comentario: "Buen lugar",
};

test("rechaza solicitudes sin sesión y roles comunes antes de buscar reseñas", async () => {
  const consultas = consultaReporte.mock.callCount();
  for (const [usuario, status] of [[undefined, 401], ["cliente", 403], ["particular", 403]] as const) {
    const respuesta = await descargar(usuario);
    assert.equal(respuesta.status, status);
    await respuesta.json();
  }
  assert.equal(consultaReporte.mock.callCount(), consultas);
});

test("consulta cada asignación vigente, admite varias sedes y bloquea una revocación", async () => {
  for (const sede of ["jj-poblado", "power-laureles"]) {
    const respuesta = await descargar("admin-a", sede);
    assert.equal(respuesta.status, 200);
    assert.equal(consultaReporte.mock.calls.at(-1)?.arguments[1], sede);
    await respuesta.text();
  }

  const consultas = consultaReporte.mock.callCount();
  const otraSede = await descargar("admin-a", "fit-belen");
  assert.equal(otraSede.status, 403);
  await otraSede.json();
  asignaciones.delete("admin-a:power-laureles");
  const revocada = await descargar("admin-a", "power-laureles");
  assert.equal(revocada.status, 403);
  await revocada.json();
  assert.equal(consultaReporte.mock.callCount(), consultas);
  assert.deepEqual(buscarAsignacion.mock.calls.at(-1)?.arguments[0], {
    where: { usuarioId_gymSlug: { usuarioId: "admin-a", gymSlug: "power-laureles" } },
    select: { id: true },
  });
});

test("superadministrador descarga cualquier sede válida sin asignación", async () => {
  const consultas = buscarAsignacion.mock.callCount();
  const respuesta = await descargar("super", "fit-belen");
  assert.equal(respuesta.status, 200);
  await respuesta.text();
  const inexistente = await descargar("super", "sede-inexistente");
  assert.equal(inexistente.status, 404);
  await inexistente.json();
  assert.equal(buscarAsignacion.mock.callCount(), consultas);
});

test("rechaza la revocación entre la comprobación inicial y el SQL y distingue un reporte vacío", async () => {
  buscarAsignacion.mock.mockImplementationOnce(async () => {
    asignaciones.delete("admin-revocado:jj-poblado");
    return { id: "asignacion-observada-antes-de-la-revocacion" };
  });
  const consultas = consultaReporte.mock.callCount();
  const revocada = await descargar("admin-revocado");
  assert.equal(revocada.status, 403);
  assert.equal(revocada.headers.get("content-disposition"), null);
  await revocada.json();
  assert.equal(consultaReporte.mock.callCount(), consultas + 1);
  const [sql, sede, actor] = consultaReporte.mock.calls.at(-1)!.arguments;
  assert.equal(actor, "admin-revocado");
  assert.equal(sede, "jj-poblado");
  assert.match(sql.join("?"), /FROM admin_sedes a\s+WHERE a.usuario_id = p.admin_id AND a.gym_slug = p.sede/);

  const vacioValido = await descargar("admin-a");
  assert.equal(vacioValido.status, 200);
  assert.equal(await vacioValido.text(), "sede,fecha,calificacion,comentario\r\n");
});

test("rechaza fechas imposibles, repetidas e invertidas antes de consultar", async () => {
  const consultas = consultaReporte.mock.callCount();
  for (const query of [
    "?desde=2026-02-29", "?hasta=0000-01-01", "?desde=2026-1-25",
    "?desde=2026-11-26&hasta=2026-11-25", "?hasta=2026-11-25&hasta=2026-11-26",
  ]) {
    const respuesta = await descargar("super", "jj-poblado", query);
    assert.equal(respuesta.status, 400, query);
    await respuesta.json();
  }
  assert.equal(consultaReporte.mock.callCount(), consultas);
});

test("parametriza la sede y los límites inclusivos de calendario de Bogotá", async () => {
  for (const [usuario, desde, hasta] of [
    ["super", "2026-11-25", "2026-11-25"],
    ["super", "2024-02-29", null],
    ["admin-a", null, "2026-11-25"],
  ] as const) {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    const respuesta = await descargar(usuario, "jj-poblado", "?" + params.toString());
    assert.equal(respuesta.status, 200);
    await respuesta.text();
    const [sql, ...valores] = consultaReporte.mock.calls.at(-1)!.arguments;
    assert.deepEqual(valores, ["jj-poblado", usuario === "admin-a" ? usuario : null,
      desde, hasta, 5001, 5000, 8 * 1024 * 1024]);
    const sentencia = sql.join("?");
    assert.match(sentencia, /p.autorizado AND r.gym_slug = p.sede/);
    assert.match(sentencia, /calificacion BETWEEN 1 AND 5/);
    assert.match(sentencia, /creado_en >= \(p.desde::timestamp AT TIME ZONE 'America\/Bogota'\)/);
    assert.match(sentencia, /creado_en < \(\(p.hasta \+ 1\)::timestamp AT TIME ZONE 'America\/Bogota'\)/);
  }
});

test("entrega CSV UTF-8 con encabezados y protege comentarios al abrirlos como hoja de cálculo", async () => {
  const comentarios = [
    'Café, "excelente"; bien\nVolveré', "=1+1", " \t+1", "\u200b-1", "@texto", "＝1",
    "\ttexto", "\ntexto", "\rtexto", "\u0085texto", "\u00a0+1", "'=1", "﹣1", null,
  ];
  consultaReporte.mock.mockImplementationOnce(async () => conFilas(comentarios.map((comentario, i) => ({
    ...fila, calificacion: i % 5 + 1, comentario, usuario_id: "no-exportar",
  }))));
  const respuesta = await descargar("admin-a");
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get("content-type") ?? "", /^text\/csv; charset=utf-8$/i);
  assert.equal(respuesta.headers.get("content-disposition"), 'attachment; filename="resenas-jj-poblado.csv"');
  assert.equal(respuesta.headers.get("cache-control"), "private, no-store");
  const bytes = Buffer.from(await respuesta.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const csv = bytes.toString("utf8");
  assert.match(csv, /^\uFEFFsede,fecha,calificacion,comentario\r\n/);
  assert.match(csv, /"Café, ""excelente""; bien\nVolveré"/);
  const celdas = parse(csv, { bom: true });
  assert.deepEqual(celdas, [
    ["sede", "fecha", "calificacion", "comentario"],
    ...comentarios.map((comentario, i) => ["jj-poblado", fila.creado_en.toISOString(), String(i % 5 + 1),
      comentario === null ? "" : i === 0 ? comentario : "[texto] " + comentario]),
  ]);
  // Simula volver a guardar los valores ya importados con otro separador.
  const guardado = celdas.map((registro: string[]) =>
    registro.map((celda) => '"' + celda.replaceAll('"', '""') + '"').join(";")
  ).join("\r\n");
  assert.deepEqual(parse(guardado, { delimiter: ";" }), celdas);
});

test("devuelve un CSV con encabezados vacíos de filas y rechaza reportes sobredimensionados", async () => {
  const vacio = await descargar("limite");
  assert.equal(vacio.status, 200);
  assert.equal(await vacio.text(), "sede,fecha,calificacion,comentario\r\n");
  consultaReporte.mock.mockImplementationOnce(async () => [estadoConsulta("limite_filas")]);
  const excesivo = await descargar("limite");
  assert.equal(excesivo.status, 422);
  assert.equal(excesivo.headers.get("content-disposition"), null);
  await excesivo.json();
  consultaReporte.mock.mockImplementationOnce(async () => [estadoConsulta("limite_bytes")]);
  const demasiadoGrande = await descargar("limite");
  assert.equal(demasiadoGrande.status, 422);
  await demasiadoGrande.json();
  consultaReporte.mock.mockImplementationOnce(async () =>
    conFilas([{ ...fila, comentario: "é".repeat(4 * 1024 * 1024) }]));
  const excedeAlSerializar = await descargar("limite");
  assert.equal(excedeAlSerializar.status, 422);
  assert.equal(excedeAlSerializar.headers.get("content-disposition"), null);
  await excedeAlSerializar.json();
});

test("contabiliza exactamente el BOM, UTF-8, comillas escapadas y CRLF", () => {
  const filas = [{ ...fila, comentario: '=1, "Bogotá"\n🙂' }];
  const csv = generarCsvResenas(filas, 1000);
  assert.ok(csv);
  const bytes = Buffer.byteLength(csv, "utf8");
  assert.equal(generarCsvResenas(filas, bytes), csv);
  assert.equal(generarCsvResenas(filas, bytes - 1), null);
});

test("limita las descargas por usuario y no consulta reseñas al superar la cuota", async () => {
  const consultas = consultaReporte.mock.callCount();
  const rolesConsultados = buscarRol.mock.callCount();
  for (let i = 0; i < 10; i++) {
    const respuesta = await descargar("frecuencia");
    assert.equal(respuesta.status, 200);
    await respuesta.text();
  }
  const bloqueada = await descargar("frecuencia");
  assert.equal(bloqueada.status, 429);
  await bloqueada.json();
  assert.equal(consultaReporte.mock.callCount(), consultas + 10);
  assert.equal(buscarRol.mock.callCount(), rolesConsultados + 10);
});
