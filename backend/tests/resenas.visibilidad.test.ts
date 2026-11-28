import assert from "node:assert/strict";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import express, { type RequestHandler } from "express";
import { AppError } from "../src/errors/AppError.js";
import { errorHandler } from "../src/middleware/error.middleware.js";

const sede = "jj-poblado";
const otraSede = "power-laureles";
const creadoEn = new Date("2026-01-01T00:00:00Z");
const historicas = [1, 2, 3, 4, 5].map(calificacion => ({
  id: String(calificacion), gymSlug: sede, calificacion, comentario: "Experiencia previa",
  usuarioId: "otra-persona", creadoEn,
}));
const otraResena = { ...historicas[0], id: "otra-sede", gymSlug: otraSede };
const findMany = mock.fn(async ({ where }: {
  where: { gymSlug: string; calificacion?: { gte: number } };
}) => [...historicas, otraResena].filter(resena =>
  resena.gymSlug === where.gymSlug && resena.calificacion >= (where.calificacion?.gte ?? 1)
));
const create = mock.fn(async ({ data }: {
  data: { usuarioId: string; gymSlug: string; calificacion: number; comentario: string };
}) => ({ ...data, id: "nueva", creadoEn }));

const requireAuth: RequestHandler = (req, _res, next) => {
  const usuario = req.get("x-usuario-sintetico");
  if (!usuario) return next(new AppError(401, "No autorizado."));
  req.userId = usuario;
  next();
};
mock.module(new URL("../src/middleware/auth.middleware.ts", import.meta.url).href, {
  namedExports: { requireAuth },
});
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  namedExports: { prisma: {
    resena: { findMany, create },
    usuario: { findUnique: async ({ where }: { where: { idusuario: string } }) => ({
      tipoUsuario: where.idusuario === "admin" ? "admin" : "cliente",
    }) },
    miembroSede: { findUnique: async ({ where }: { where: { usuarioId: string } }) =>
      where.usuarioId === "cliente" ? { gymSlug: sede } : null },
  } },
});

const { default: router } = await import("../src/routes/resenas.routes.js");
const app = express();
app.use(express.json());
app.use("/api/resenas", router);
app.use(errorHandler);
const servidor = app.listen(0, "127.0.0.1");
after(() => servidor.close());
await once(servidor, "listening");
const direccion = servidor.address();
assert.ok(direccion && typeof direccion === "object");
const base = `http://127.0.0.1:${direccion.port}/api/resenas`;

function publicar(calificacion: number, gymSlug = sede, usuario = "cliente") {
  return fetch(base, {
    method: "POST",
    headers: { "content-type": "application/json", "x-usuario-sintetico": usuario },
    body: JSON.stringify({ calificacion, gymSlug, comentario: "Mi experiencia", usuarioId: "otra-persona" }),
  });
}

test("el listado de la sede muestra reseñas existentes de las cinco calificaciones sin exponer el autor", async () => {
  const respuesta = await fetch(`${base}/gimnasio/${sede}`, {
    headers: { "x-usuario-sintetico": "cliente" },
  });
  assert.equal(respuesta.status, 200);
  const { resenas } = await respuesta.json();
  assert.deepEqual(resenas, historicas.map(({ id, calificacion, comentario }) => ({
    id, gym_slug: sede, calificacion, comentario, creado_en: creadoEn.toISOString(),
  })));
  assert.deepEqual(findMany.mock.calls[0].arguments[0].where, { gymSlug: sede });
});

test("publicar acepta enteros de 1 a 5 y vincula cada reseña al usuario autenticado", async () => {
  for (const nota of [1, 2, 3, 4, 5]) {
    const respuesta = await publicar(nota);
    assert.equal(respuesta.status, 201);
    assert.equal((await respuesta.json()).resena.calificacion, nota);
    assert.deepEqual(create.mock.calls.at(-1)?.arguments[0].data, {
      usuarioId: "cliente", gymSlug: sede, calificacion: nota, comentario: "Mi experiencia",
    });
  }
  const escrituras = create.mock.callCount();
  for (const nota of [0, 6, 2.5]) {
    assert.equal((await publicar(nota)).status, 400);
  }
  assert.equal(create.mock.callCount(), escrituras);
});

test("las rutas siguen exigiendo sesión y preservan los permisos de publicación y consulta global", async () => {
  const escrituras = create.mock.callCount();
  assert.equal((await fetch(`${base}/gimnasio/${sede}`)).status, 401);
  assert.equal((await publicar(1, otraSede)).status, 403);
  assert.equal((await publicar(1, sede, "cliente-sin-sede")).status, 403);
  assert.equal((await publicar(1, sede, "admin")).status, 403);
  assert.equal((await fetch(`${base}/todas`, {
    headers: { "x-usuario-sintetico": "admin" },
  })).status, 403);
  assert.equal(create.mock.callCount(), escrituras);
});
