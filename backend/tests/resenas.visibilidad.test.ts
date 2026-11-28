import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { after, mock, test } from "node:test";
import express, { type RequestHandler } from "express";
import { AppError } from "../src/errors/AppError.js";
import { errorHandler } from "../src/middleware/error.middleware.js";

const sede = "jj-poblado";
const otraSede = "power-laureles";
const creadoEn = new Date("2026-01-01T00:00:00Z");
const historicas = [1, 2, 3, 4, 5].map(calificacion => ({
  id: randomUUID(), gymSlug: sede, calificacion, comentario: "Experiencia previa",
  usuarioId: "otra-persona", creadoEn,
}));
const otraResena = { ...historicas[0], id: randomUUID(), gymSlug: otraSede, usuarioId: "particular-historico" };
const filas: Fila[] = [...historicas, otraResena];
type Fila = typeof otraResena & { visibilidad?: "VISIBLE" | "OCULTA"; revision?: number };
const asignaciones = new Map([["admin", sede], ["admin-colega", sede], ["admin-otra", otraSede]]);
const roles = new Map([...asignaciones.keys()].map(id => [id, "admin"]));
roles.set("super", "super_admin");
const rolUsuario = (id: string) => roles.get(id) ??
  (id.startsWith("particular") || id === "otra-persona" ? "usuario_particular" : "cliente");
const membresias = new Map([["cliente", sede]]);
const votosUtiles = new Map<string, Set<string>>();
let antesDeInsertarVoto: ((id: string, usuario: string) => Promise<void>) | undefined;
let alEsperarVoto: ((clave: string) => void) | undefined;
type Respuesta = {
  resenaId: string; texto: string; creadoEn: Date; actualizadoEn: Date;
  creadoPorId: string; actualizadoPorId: string; eliminadoEn: Date | null; eliminadoPorId: string | null;
};
const respuestas = new Map<string, Respuesta>();
let antesDeConsultarAsignacion: (() => Promise<void>) | undefined;
let antesDeBloquearRol: (() => Promise<void>) | undefined;
type Filtro = Partial<Pick<Fila, "id" | "gymSlug" | "usuarioId">> & {
  calificacion?: number | { gte: number; lte?: number };
  comentario?: { contains: string; mode: "insensitive" };
  respuesta?: { is: null | { eliminadoEn: null | { not: null } } };
  OR?: Filtro[];
  visibilidad?: "VISIBLE" | "OCULTA";
};
function buscar(where: Filtro, fila: Fila) {
  const nota = where.calificacion;
  const literal = where.comentario?.contains.replace(/\\([\\%_])/g, "$1");
  const respuesta = respuestas.get(fila.id);
  const filtroRespuesta = where.respuesta?.is;
  const coincideRespuesta = filtroRespuesta === undefined || (filtroRespuesta === null ? !respuesta
    : respuesta && (filtroRespuesta.eliminadoEn === null ? !respuesta.eliminadoEn : Boolean(respuesta.eliminadoEn)));
  return (!where.id || where.id === fila.id) &&
    (!where.visibilidad || where.visibilidad === (fila.visibilidad ?? "VISIBLE")) &&
    (!where.usuarioId || where.usuarioId === fila.usuarioId) &&
    (!where.gymSlug || where.gymSlug === fila.gymSlug) &&
    (typeof nota === "number" ? fila.calificacion === nota
      : fila.calificacion >= (nota?.gte ?? 1) && fila.calificacion <= (nota?.lte ?? Infinity)) &&
    (!literal || fila.comentario.toLowerCase().includes(literal.toLowerCase())) && coincideRespuesta &&
    (!where.OR || where.OR.some(filtro => buscar(filtro, fila)));
}
const conRespuesta = ({ visibilidad: _visibilidad, ...fila }: Fila) => ({ ...fila, respuesta: respuestas.get(fila.id) });
const findMany = mock.fn(async ({ where = {}, select }: {
  where?: Filtro; select?: { respuesta?: unknown; visibilidad?: boolean };
}) => filas.filter(fila => buscar(where, fila)).map(({ visibilidad, ...fila }) =>
  select?.respuesta ? conRespuesta(fila) : { ...fila, visibilidad: select?.visibilidad ? visibilidad ?? "VISIBLE" : undefined }));
const create = mock.fn(async ({ data }: {
  data: { usuarioId: string; gymSlug: string; calificacion: number; comentario: string };
}) => {
  await new Promise(resolve => setImmediate(resolve));
  const fila = { ...data, id: randomUUID(), creadoEn };
  filas.push(fila);
  return fila;
});
const bloqueos = new Map<string, Promise<void>>();
const resena = {
  findMany,
  updateManyAndReturn: async ({ where, data }: {
    where: Filtro; data: Pick<Fila, "calificacion" | "comentario"> & { revision?: { increment: number } };
  }) => filas.filter(fila => buscar(where, fila)).map(fila => {
    const { revision, ...contenido } = data;
    Object.assign(fila, contenido, { revision: (fila.revision ?? 1) + (revision?.increment ?? 0) });
    return { ...fila, visibilidad: fila.visibilidad ?? "VISIBLE" };
  }),
  deleteMany: async ({ where }: { where: Filtro }) => {
    const indice = filas.findIndex(fila => buscar(where, fila));
    if (indice === -1) return { count: 0 };
    const [borrada] = filas.splice(indice, 1);
    respuestas.delete(borrada.id);
    votosUtiles.delete(borrada.id);
    return { count: 1 };
  },
};
const lecturaPaginada = {
  groupBy: async ({ where, by }: { where: Filtro; by: string[] }) => {
    assert.deepEqual(by, ["calificacion"]);
    const grupos = new Map<number, number>();
    for (const fila of filas.filter(fila => buscar(where, fila))) {
      grupos.set(fila.calificacion, (grupos.get(fila.calificacion) ?? 0) + 1);
    }
    return [...grupos].map(([calificacion, cantidad]) => ({ calificacion, _count: { _all: cantidad } }));
  },
  count: async ({ where }: { where: Filtro }) => filas.filter(fila => buscar(where, fila)).length,
  findMany: mock.fn(async ({ where, orderBy, skip, take }: {
    where: Filtro; orderBy: Partial<Record<"id" | "creadoEn" | "calificacion", "asc" | "desc">>[];
    skip: number; take: number;
  }) => filas.filter(fila => buscar(where, fila)).sort((a, b) => {
    for (const criterio of orderBy) {
      const campo = Object.keys(criterio)[0] as keyof typeof criterio;
      const comparacion = a[campo] < b[campo] ? -1 : a[campo] > b[campo] ? 1 : 0;
      if (comparacion) return criterio[campo] === "asc" ? comparacion : -comparacion;
    }
    return 0;
  }).slice(skip, skip + take).map(conRespuesta)),
};

const respuestaResena = {
  findUnique: async ({ where }: { where: { resenaId: string } }) => respuestas.get(where.resenaId),
  create: async ({ data }: { data: Pick<Respuesta, "resenaId" | "texto" | "creadoPorId" | "actualizadoPorId"> }) => {
    assert.ok(!respuestas.has(data.resenaId), "La PK no admite dos respuestas");
    await new Promise(resolve => setImmediate(resolve));
    const respuesta = { ...data, creadoEn, actualizadoEn: creadoEn, eliminadoEn: null, eliminadoPorId: null };
    respuestas.set(data.resenaId, respuesta);
    return respuesta;
  },
  update: async ({ where, data }: { where: { resenaId: string }; data: Partial<Respuesta> }) => {
    const respuesta = respuestas.get(where.resenaId);
    assert.ok(respuesta);
    return Object.assign(respuesta, data, { actualizadoEn: new Date() });
  },
};
const adminSede = {
  findFirst: async ({ where }: { where: { usuarioId: string; gymSlug: string; usuario: { tipoUsuario: string } } }) =>
    asignaciones.get(where.usuarioId) === where.gymSlug && roles.get(where.usuarioId) === where.usuario.tipoUsuario
      ? { id: "asignacion" } : null,
};
const votoUtilResena = {
  createMany: async ({ data: [voto], skipDuplicates }: {
    data: { resenaId: string; usuarioId: string }[]; skipDuplicates: boolean;
  }) => {
    assert.equal(skipDuplicates, true);
    await antesDeInsertarVoto?.(voto.resenaId, voto.usuarioId);
    await new Promise(resolve => setImmediate(resolve));
    const conjunto = votosUtiles.get(voto.resenaId) ?? new Set<string>();
    conjunto.add(voto.usuarioId);
    votosUtiles.set(voto.resenaId, conjunto);
  },
  deleteMany: async ({ where }: { where: { resenaId: string; usuarioId: string } }) => {
    votosUtiles.get(where.resenaId)?.delete(where.usuarioId);
  },
  count: async ({ where }: { where: { resenaId: string } }) => votosUtiles.get(where.resenaId)?.size ?? 0,
};
async function $transaction(
  operacion: (tx: object) => Promise<unknown>,
  opciones: { isolationLevel: string },
) {
  if (opciones.isolationLevel === "RepeatableRead") return operacion({ resena: lecturaPaginada, adminSede });
  assert.equal(opciones.isolationLevel, "ReadCommitted");
  let liberar: (() => void) | undefined;
  let claveBloqueada: string | undefined;
  let rolBloqueado: string | undefined;
  let resenaProtegida: string | undefined;
  async function bloquear(clave: string) {
    const anterior = bloqueos.get(clave);
    bloqueos.set(clave, new Promise(resolve => { liberar = resolve; }));
    if (anterior) alEsperarVoto?.(clave);
    await anterior;
    claveBloqueada = clave;
  }
  try {
    return await operacion({
      async $queryRaw(sql: TemplateStringsArray, clave: string, resenaId?: string) {
        const consulta = sql.join("?");
        if (consulta.includes("AS rol FROM usuarios")) {
          assert.match(consulta, /FOR SHARE/);
          rolBloqueado = clave;
          return [{ id: clave, rol: rolUsuario(clave) }];
        }
        if (consulta.includes("AS sede FROM resenas")) {
          assert.ok(rolBloqueado);
          assert.match(consulta, /visibilidad = 'VISIBLE' FOR SHARE/);
          const fila = filas.find(fila => fila.id === clave && fila.visibilidad !== "OCULTA");
          resenaProtegida = fila?.id;
          return fila ? [{ id: fila.id, autor: fila.usuarioId, sede: fila.gymSlug }] : [];
        }
        if (consulta.includes("FROM miembros_sede")) {
          assert.equal(rolBloqueado, clave);
          assert.match(consulta, /FOR SHARE/);
          return membresias.get(clave) === resenaId ? [{ gym_slug: resenaId }] : [];
        }
        if (consulta.includes("FROM usuarios")) {
          assert.match(consulta, /tipo_usuario = 'admin'\s+FOR SHARE/);
          await antesDeBloquearRol?.();
          if (roles.get(clave) !== "admin") return [];
          rolBloqueado = clave;
          return [{ idusuario: clave }];
        }
        if (consulta.includes("JOIN admin_sedes")) {
          assert.equal(rolBloqueado, clave);
          assert.match(consulta, /FOR UPDATE OF r FOR SHARE OF a/);
          const fila = filas.find(fila => fila.id === resenaId);
          await antesDeConsultarAsignacion?.();
          if (!fila || fila.visibilidad === "OCULTA" || asignaciones.get(clave) !== fila.gymSlug) return [];
          await bloquear("respuesta:" + resenaId);
          return [{ id: resenaId }];
        }
        assert.match(consulta, /pg_advisory_xact_lock\(hashtextextended\(\?, 0\)\)/);
        await bloquear(clave);
      },
      resena: {
        findFirst: async ({ where }: { where: Filtro }) => {
          assert.equal(claveBloqueada, JSON.stringify(["resenas", where.usuarioId, where.gymSlug]));
          return filas.find(fila => buscar(where, fila));
        },
        create,
      },
      respuestaResena,
      votoUtilResena: {
        createMany: async (args: Parameters<typeof votoUtilResena.createMany>[0]) => {
          const [voto] = args.data;
          assert.equal(resenaProtegida, voto.resenaId);
          assert.equal(claveBloqueada, JSON.stringify(["voto-util-resena", voto.usuarioId, voto.resenaId]));
          return votoUtilResena.createMany(args);
        },
        deleteMany: async (args: Parameters<typeof votoUtilResena.deleteMany>[0]) => {
          const { resenaId, usuarioId } = args.where;
          assert.equal(resenaProtegida, resenaId);
          assert.equal(claveBloqueada, JSON.stringify(["voto-util-resena", usuarioId, resenaId]));
          return votoUtilResena.deleteMany(args);
        },
        count: votoUtilResena.count,
      },
    });
  } finally {
    liberar?.();
  }
}

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
    resena,
    $transaction,
    $queryRaw: async (sql: TemplateStringsArray, sedes: string[], usuarioId: string, ids: string[]) => {
      assert.match(sql.join("?"), /votos_utiles_resenas/);
      return filas.filter(fila => ids.includes(fila.id)).map(fila => ({
        id: fila.id, cantidad: BigInt(votosUtiles.get(fila.id)?.size ?? 0),
        mi_voto_util: votosUtiles.get(fila.id)?.has(usuarioId) ?? false,
        puede_denunciar: fila.visibilidad !== "OCULTA" && sedes.includes(fila.gymSlug) &&
          (rolUsuario(usuarioId) === "usuario_particular" ||
            (rolUsuario(usuarioId) === "cliente" && membresias.get(usuarioId) === fila.gymSlug)),
        puede_votar: fila.visibilidad !== "OCULTA" && fila.usuarioId !== usuarioId && sedes.includes(fila.gymSlug) &&
          (rolUsuario(usuarioId) === "usuario_particular" ||
            (rolUsuario(usuarioId) === "cliente" && membresias.get(usuarioId) === fila.gymSlug)),
      }));
    },
    usuario: { findUnique: async ({ where }: { where: { idusuario: string } }) => ({
      tipoUsuario: rolUsuario(where.idusuario),
    }) },
    miembroSede: { findUnique: async ({ where }: { where: { usuarioId: string } }) =>
      membresias.has(where.usuarioId) ? { gymSlug: membresias.get(where.usuarioId) } : null },
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

function publicar(calificacion: unknown, gymSlug = sede, usuario = "cliente") {
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
    votos_utiles: 0, mi_voto_util: false, puede_votar: true, puede_denunciar: true,
  })));
  assert.deepEqual(findMany.mock.calls[0].arguments[0].where, { gymSlug: sede, visibilidad: "VISIBLE" });
});

test("publicar acepta enteros de 1 a 5 y vincula cada reseña al usuario autenticado", async () => {
  for (const nota of [1, 2, 3, 4, 5]) {
    const usuario = `particular-${nota}`;
    const respuesta = await publicar(nota, sede, usuario);
    assert.equal(respuesta.status, 201);
    assert.equal((await respuesta.json()).resena.calificacion, nota);
    assert.deepEqual(create.mock.calls.at(-1)?.arguments[0].data, {
      usuarioId: usuario, gymSlug: sede, calificacion: nota, comentario: "Mi experiencia",
    });
  }
  const escrituras = create.mock.callCount();
  for (const nota of [0, 6, 2.5, true, [3]]) {
    assert.equal((await publicar(nota)).status, 400);
  }
  assert.equal(create.mock.callCount(), escrituras);
});

function misResenas(usuario: string, metodo = "GET", id = "", body?: object) {
  return fetch(`${base}/mias${id ? "/" + id : ""}`, {
    method: metodo,
    headers: { "content-type": "application/json", "x-usuario-sintetico": usuario },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test("consulta privada por sesión conserva todas las reseñas históricas propias", async () => {
  assert.equal((await fetch(`${base}/mias`)).status, 401);
  const respuesta = await misResenas("otra-persona");
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get("cache-control"), "private, no-store");
  const { resenas } = await respuesta.json();
  assert.deepEqual(resenas.map((fila: { id: string }) => fila.id), historicas.map(fila => fila.id));
  assert.ok(resenas.every((fila: { usuarioId?: string }) => !("usuarioId" in fila)));
  assert.deepEqual(await (await misResenas("cliente-sin-sede")).json(), { resenas: [] });
});

test("editar conserva autor, sede y fecha; editar o eliminar una reseña ajena devuelve 404", async () => {
  const id = otraResena.id;
  const nuevo = { calificacion: 2, comentario: "  Cambio válido  " };
  assert.equal((await misResenas("otra-persona", "PATCH", id, nuevo)).status, 404);
  assert.equal((await misResenas("otra-persona", "DELETE", id)).status, 404);
  for (const datos of [
    { ...nuevo, usuarioId: "otra-persona" }, { ...nuevo, gymSlug: sede },
    { ...nuevo, calificacion: 6 }, { ...nuevo, calificacion: 1.5 },
    { ...nuevo, comentario: " " }, { ...nuevo, comentario: "x".repeat(1001) },
  ]) {
    assert.equal((await misResenas("particular-historico", "PATCH", id, datos)).status, 400);
  }
  const editada = await misResenas("particular-historico", "PATCH", id, nuevo);
  assert.equal(editada.status, 200);
  assert.deepEqual(await editada.json(), { resena: {
    id, gym_slug: otraSede, calificacion: 2, comentario: "Cambio válido", creado_en: creadoEn.toISOString(),
    estado_moderacion: "VISIBLE",
  } });
  assert.equal(otraResena.usuarioId, "particular-historico");
  const consultar = async () => (await fetch(`${base}/gimnasio/${otraSede}`, {
    headers: { "x-usuario-sintetico": "cliente" },
  })).json();
  assert.equal((await consultar()).resenas[0].calificacion, 2);
  assert.equal((await misResenas("particular-historico", "DELETE", id)).status, 204);
  assert.equal((await misResenas("particular-historico", "DELETE", id)).status, 404);
  assert.deepEqual(await consultar(), { resenas: [] });
  assert.deepEqual(await (await misResenas("particular-historico")).json(), { resenas: [] });
});

test("serializa publicaciones concurrentes por usuario y sede y conserva los duplicados históricos", async () => {
  const respuestas = await Promise.all([
    publicar(1), publicar(5), publicar(2, sede, "particular-nuevo"),
    publicar(3, otraSede, "particular-nuevo"),
  ]);
  assert.deepEqual(respuestas.slice(0, 2).map(respuesta => respuesta.status).sort(), [201, 409]);
  assert.deepEqual(respuestas.slice(2).map(respuesta => respuesta.status), [201, 201]);
  assert.equal((await publicar(3, sede, "otra-persona")).status, 409);
  assert.equal(filas.filter(fila => fila.usuarioId === "otra-persona" && fila.gymSlug === sede).length, 5);
  const propias = await (await misResenas("cliente")).json();
  assert.equal(propias.resenas.length, 1);
  const id = propias.resenas[0].id;
  const eliminaciones = await Promise.all([misResenas("cliente", "DELETE", id), misResenas("cliente", "DELETE", id)]);
  assert.deepEqual(eliminaciones.map(respuesta => respuesta.status).sort(), [204, 404]);
  assert.equal((await publicar(4)).status, 201);
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

const consultarPagina = (query: string, gymSlug = "fit-belen") => fetch(`${base}/gimnasio/${gymSlug}?${query}`, {
  headers: { "x-usuario-sintetico": "cliente" },
});

test("la consulta avanzada valida entradas y conserva la forma del contrato sin parámetros", async () => {
  for (const query of ["limite=51", "limite=0", "pagina=1.5", "pagina=0", "pagina=9007199254740992",
    "pagina=1&pagina=2", "orden=otro", "calificacion=6", "buscar=" + "x".repeat(121), "buscar=%00",
    "pagina=1&rol=super_admin"]) {
    assert.equal((await consultarPagina(query)).status, 400, query);
  }
  assert.equal((await consultarPagina("pagina=1", "otra-sede")).status, 404);
  assert.equal((await fetch(`${base}/gimnasio/${sede}?pagina=1`)).status, 401);
  const legacy = await (await consultarPagina("")).json();
  assert.deepEqual(legacy, { resenas: [] });
  const vacia = await (await consultarPagina("pagina=4")).json();
  assert.deepEqual(vacia.paginacion, { pagina: 1, limite: 10, total: 0, paginas: 0 });
  assert.equal(vacia.estadisticas.promedio, null);
  assert.deepEqual(vacia.estadisticas.distribucion.map((fila: { cantidad: number; proporcion: number | null }) =>
    [fila.cantidad, fila.proporcion]), Array.from({ length: 5 }, () => [0, null]));
});

test("agrupa toda la sede, combina filtros y usa el identificador para desempatar páginas", async () => {
  const baseSede = { ...otraResena, gymSlug: "fit-belen" };
  const nuevas = [1, 2, 3, 4, 5, 5, 0, 6].map((calificacion, indice) => ({
    ...baseSede, id: `00000000-0000-4000-8000-${String(indice + 1).padStart(12, "0")}`,
    calificacion, comentario: indice === 4 ? "Equipo 100%_nuevo" : "Comentario común",
  }));
  filas.push(...nuevas);
  const primera = await (await consultarPagina("limite=1&orden=mejor")).json();
  const segunda = await (await consultarPagina("limite=1&orden=mejor&pagina=2")).json();
  assert.equal(primera.resenas[0].id, nuevas[5].id);
  assert.equal(segunda.resenas[0].id, nuevas[4].id);
  assert.deepEqual(segunda.paginacion, { pagina: 2, limite: 1, total: 6, paginas: 6 });
  assert.deepEqual(primera.estadisticas, {
    total: 6, promedio: 20 / 6,
    distribucion: [5, 4, 3, 2, 1].map(valor => ({ valor, cantidad: valor === 5 ? 2 : 1, proporcion: valor === 5 ? 2 / 6 : 1 / 6 })),
  });
  assert.ok(!("usuarioId" in primera.resenas[0]));
  for (const [orden, indice] of [["antiguas", 0], ["recientes", 5], ["peor", 0]] as const) {
    const pagina = await (await consultarPagina(`limite=1&orden=${orden}`)).json();
    assert.equal(pagina.resenas[0].id, nuevas[indice].id);
  }
  const porNota = await (await consultarPagina("calificacion=5")).json();
  assert.equal(porNota.paginacion.total, 2);
  const porComentario = await (await consultarPagina("buscar=COMÚN")).json();
  assert.equal(porComentario.paginacion.total, 5);
  const combinada = await (await consultarPagina("buscar=100%25_&calificacion=5&limite=50&pagina=99")).json();
  assert.deepEqual(combinada.resenas.map((fila: { id: string }) => fila.id), [nuevas[4].id]);
  assert.deepEqual(combinada.paginacion, { pagina: 1, limite: 50, total: 1, paginas: 1 });
  assert.deepEqual(combinada.estadisticas, primera.estadisticas);
  const args = lecturaPaginada.findMany.mock.calls.at(-1)?.arguments[0];
  assert.equal(args?.where.comentario?.contains, "100\\%\\_");
  const sinCoincidencias = await (await consultarPagina("calificacion=1&buscar=Equipo")).json();
  assert.deepEqual(sinCoincidencias.resenas, []);
  assert.equal(sinCoincidencias.paginacion.total, 0);
  assert.deepEqual(sinCoincidencias.estadisticas, primera.estadisticas);
});

test("la estadística cambia tras publicar, editar y eliminar sin afectar otra sede", async () => {
  const antes = await (await consultarPagina("pagina=1", sede)).json();
  const originalOtra = await (await consultarPagina("pagina=1", otraSede)).json();
  const creacion = await publicar(1, sede, "particular-estadisticas");
  assert.equal(creacion.status, 201);
  const { resena: creada } = await creacion.json();
  const despuesDePublicar = await (await consultarPagina("pagina=1", sede)).json();
  assert.equal(despuesDePublicar.estadisticas.total, antes.estadisticas.total + 1);
  assert.equal(despuesDePublicar.estadisticas.distribucion[4].cantidad, antes.estadisticas.distribucion[4].cantidad + 1);
  const edicion = await misResenas("particular-estadisticas", "PATCH", creada.id, { calificacion: 5, comentario: "Editada" });
  assert.equal(edicion.status, 200);
  const despuesDeEditar = await (await consultarPagina("pagina=1", sede)).json();
  assert.ok(Math.abs(despuesDeEditar.estadisticas.promedio - despuesDePublicar.estadisticas.promedio -
    4 / despuesDeEditar.estadisticas.total) < 1e-10);
  assert.equal((await misResenas("particular-estadisticas", "DELETE", creada.id)).status, 204);
  const final = await (await consultarPagina("pagina=1", sede)).json();
  assert.deepEqual(final.estadisticas, antes.estadisticas);
  assert.deepEqual(await (await consultarPagina("pagina=1", otraSede)).json(), originalOtra);
});

const gestion = (usuario: string, ruta: string, method = "GET", body?: object) => fetch(`${base}/gestion/${ruta}`, {
  method,
  headers: { "content-type": "application/json", "x-usuario-sintetico": usuario },
  body: body ? JSON.stringify(body) : undefined,
});

test("la gestión paginada exige rol y asignación, incluso si la consulta pública está permitida", async () => {
  for (const usuario of ["cliente", "super"]) {
    assert.equal((await gestion(usuario, `gimnasio/${sede}`)).status, 403);
  }
  assert.equal((await gestion("admin-otra", `gimnasio/${sede}`)).status, 403);
  assert.equal((await gestion("admin", `gimnasio/${otraSede}`)).status, 403);
  assert.equal((await gestion("admin", `gimnasio/${sede}?estadoRespuesta=invalido`)).status, 400);
  const respuesta = await gestion("admin", `gimnasio/${sede}?estadoRespuesta=pendiente`);
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get("cache-control"), "private, no-store");
  const pagina = await respuesta.json();
  assert.ok(pagina.resenas.length > 0 && pagina.resenas.every((fila: { gym_slug: string }) => fila.gym_slug === sede));
});

test("solo un administrador asignado puede publicar, editar, retirar y reactivar una respuesta institucional", async () => {
  const original = historicas[0];
  const ruta = `${original.id}/respuesta`;
  const ver = async () => (await (await consultarPagina("pagina=1&limite=50", sede)).json());
  const antes = await ver();
  for (const method of ["POST", "PATCH", "DELETE"]) {
    const body = method === "DELETE" ? undefined : { texto: "Respuesta" };
    assert.equal((await gestion("admin-otra", ruta, method, body)).status, 404);
    assert.equal((await gestion("super", ruta, method, body)).status, 403);
  }
  for (const datos of [{ texto: " " }, { texto: "x".repeat(1001) }, { texto: "Valida", gymSlug: otraSede }]) {
    assert.equal((await gestion("admin", ruta, "POST", datos)).status, 400);
  }
  const duplicadas = await Promise.all([
    gestion("admin", ruta, "POST", { texto: "Respuesta institucional" }),
    gestion("admin-colega", ruta, "POST", { texto: "Respuesta institucional" }),
  ]);
  assert.deepEqual(duplicadas.map(resultado => resultado.status).sort(), [201, 409]);
  const publica = (await ver()).resenas.find((fila: { id: string }) => fila.id === original.id);
  assert.equal(publica.respuesta.texto, "Respuesta institucional");
  assert.deepEqual(Object.keys(publica.respuesta).sort(), ["actualizado_en", "creado_en", "texto"]);
  assert.equal((await (await gestion("admin", `gimnasio/${sede}?estadoRespuesta=respondida`)).json()).paginacion.total, 1);
  assert.equal((await gestion("admin-colega", ruta, "PATCH", { texto: "Respuesta editada" })).status, 200);
  assert.equal(respuestas.get(original.id)?.texto, "Respuesta editada");
  const retiro = await Promise.all([gestion("admin", ruta, "DELETE"), gestion("admin-colega", ruta, "DELETE")]);
  assert.deepEqual(retiro.map(resultado => resultado.status).sort(), [204, 404]);
  const trasRetiro = (await ver()).resenas.find((fila: { id: string }) => fila.id === original.id);
  assert.equal(trasRetiro.respuesta, undefined);
  assert.equal(respuestas.get(original.id)?.texto, "Respuesta editada");
  assert.ok(respuestas.get(original.id)?.eliminadoEn);
  assert.equal((await gestion("admin", ruta, "PATCH", { texto: "No reactiva por edición" })).status, 404);
  const pendiente = await (await gestion("admin", `gimnasio/${sede}?estadoRespuesta=pendiente&calificacion=1`)).json();
  assert.ok(pendiente.resenas.some((fila: { id: string }) => fila.id === original.id));
  const mismaFila = respuestas.get(original.id);
  assert.equal((await gestion("admin-colega", ruta, "POST", { texto: "Respuesta reactivada" })).status, 201);
  assert.equal(respuestas.get(original.id), mismaFila);
  assert.equal(respuestas.get(original.id)?.eliminadoPorId, null);
  assert.equal((await ver()).resenas.find((fila: { id: string }) => fila.id === original.id).respuesta.texto, "Respuesta reactivada");
  const legacy = await (await consultarPagina("", sede)).json();
  assert.equal(legacy.resenas.find((fila: { id: string }) => fila.id === original.id).respuesta.texto, "Respuesta reactivada");
  assert.equal(publica.calificacion, original.calificacion);
  assert.equal(publica.comentario, original.comentario);
  assert.deepEqual((await ver()).estadisticas, antes.estadisticas);
  const [edicion, retirada] = await Promise.all([
    gestion("admin", ruta, "PATCH", { texto: "Edición simultánea" }),
    gestion("admin-colega", ruta, "DELETE"),
  ]);
  assert.ok([200, 404].includes(edicion.status));
  assert.equal(retirada.status, 204);
  assert.ok(respuestas.get(original.id)?.eliminadoEn);
});

test("la escritura vuelve a verificar el rol y la asignación después de pasar el middleware", async () => {
  const ruta = `${historicas[1].id}/respuesta`;
  antesDeConsultarAsignacion = async () => { asignaciones.delete("admin"); };
  try {
    assert.equal((await gestion("admin", ruta, "POST", { texto: "Revocada" })).status, 404);
    assert.equal(respuestas.has(historicas[1].id), false);
  } finally {
    antesDeConsultarAsignacion = undefined;
    asignaciones.set("admin", sede);
  }
  antesDeBloquearRol = async () => { roles.set("admin", "super_admin"); };
  try {
    assert.equal((await gestion("admin", ruta, "POST", { texto: "Rol cambiado" })).status, 403);
    assert.equal(respuestas.has(historicas[1].id), false);
  } finally {
    antesDeBloquearRol = undefined;
    roles.set("admin", "admin");
  }
});

test("al eliminar la reseña original desaparece su respuesta y la ruta deja de admitir escrituras", async () => {
  const usuario = "particular-con-respuesta";
  const alta = await publicar(2, sede, usuario);
  const { resena: nueva } = await alta.json();
  const ruta = `${nueva.id}/respuesta`;
  assert.equal((await gestion("admin", ruta, "POST", { texto: "Respuesta" })).status, 201);
  assert.equal((await misResenas(usuario, "DELETE", nueva.id)).status, 204);
  assert.equal(respuestas.has(nueva.id), false);
  assert.equal((await gestion("admin", ruta, "POST", { texto: "Otra respuesta" })).status, 404);
});

const votoUtil = (id: string, usuario: string, method = "PUT") => fetch(`${base}/${id}/voto-util`, {
  method, headers: { "x-usuario-sintetico": usuario },
});

test("los votos respetan rol, autoría y membresía vigente y conservan un voto histórico al perder sede", async () => {
  const id = historicas[2].id;
  assert.equal((await votoUtil(id, "")).status, 401);
  assert.equal((await votoUtil(id, "otra-persona")).status, 403);
  assert.equal((await votoUtil(randomUUID(), "cliente")).status, 404);
  assert.equal((await votoUtil(otraResena.id, "cliente")).status, 404);
  for (const rol of ["admin", "super"]) {
    for (const metodo of ["PUT", "DELETE"]) assert.equal((await votoUtil(id, rol, metodo)).status, 403);
  }
  for (const marcar of [true, true]) {
    const respuesta = await votoUtil(id, "cliente");
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await respuesta.json(), { votos_utiles: 1, mi_voto_util: marcar, puede_votar: true });
  }
  membresias.delete("cliente");
  try {
    assert.equal((await votoUtil(id, "cliente", "DELETE")).status, 404);
    const lectura = await consultarPagina("pagina=1&limite=50", sede);
    assert.equal(lectura.headers.get("cache-control"), "private, no-store");
    const fila = (await lectura.json()).resenas.find((resena: { id: string }) => resena.id === id);
    assert.equal(fila.votos_utiles, 1);
    assert.equal(fila.mi_voto_util, true);
    assert.equal(fila.puede_votar, false);
    const admin = await (await gestion("admin", `gimnasio/${sede}?limite=50`)).json();
    const vistaAdmin = admin.resenas.find((resena: { id: string }) => resena.id === id);
    assert.equal(vistaAdmin.votos_utiles, 1);
    assert.equal(vistaAdmin.mi_voto_util, false);
    assert.equal(vistaAdmin.puede_votar, false);
    assert.deepEqual(Object.keys(vistaAdmin).sort(), [
      "calificacion", "comentario", "creado_en", "gym_slug", "id", "mi_voto_util", "puede_denunciar", "puede_votar", "votos_utiles",
    ]);
  } finally {
    membresias.set("cliente", sede);
  }
  for (let intento = 0; intento < 2; intento++) {
    const retirada = await votoUtil(id, "cliente", "DELETE");
    assert.equal(retirada.status, 200);
    assert.deepEqual(await retirada.json(), { votos_utiles: 0, mi_voto_util: false, puede_votar: true });
  }
});

test("dos PUT simultáneos conservan una fila y un DELETE en espera se ejecuta después del PUT", async () => {
  const id = historicas[3].id;
  const votante = "particular-votante-a";
  const otrosResultados = await Promise.all([votoUtil(id, votante), votoUtil(id, votante)]);
  assert.deepEqual(otrosResultados.map(respuesta => respuesta.status), [200, 200]);
  assert.equal(votosUtiles.get(id)?.size, 1);
  await votoUtil(id, votante, "DELETE");

  let liberar!: () => void;
  let inicio!: () => void;
  let esperando!: () => void;
  const puerta = new Promise<void>(resolve => { liberar = resolve; });
  const iniciado = new Promise<void>(resolve => { inicio = resolve; });
  const enEspera = new Promise<void>(resolve => { esperando = resolve; });
  antesDeInsertarVoto = async (resena, usuario) => {
    if (resena === id && usuario === votante) {
      inicio();
      await puerta;
    }
  };
  alEsperarVoto = clave => {
    if (clave === JSON.stringify(["voto-util-resena", votante, id])) esperando();
  };
  const alta = votoUtil(id, votante);
  try {
    await iniciado;
    const baja = votoUtil(id, votante, "DELETE");
    await enEspera;
    // El mismo ID con un votante distinto no espera el bloqueo anterior.
    assert.equal((await votoUtil(id, "particular-votante-b")).status, 200);
    liberar();
    assert.equal((await alta).status, 200);
    assert.equal((await baja).status, 200);
    assert.deepEqual([...votosUtiles.get(id) ?? []], ["particular-votante-b"]);
  } finally {
    liberar();
    antesDeInsertarVoto = undefined;
    alEsperarVoto = undefined;
  }
});

test("la eliminación de la reseña elimina votos y el SQL declara ambas cascadas", async () => {
  const autor = "particular-autor-voto";
  const alta = await publicar(1, sede, autor);
  assert.equal(alta.status, 201);
  const { resena: { id } } = await alta.json();
  assert.equal((await votoUtil(id, "cliente")).status, 200);
  assert.equal((await misResenas(autor, "DELETE", id)).status, 204);
  assert.equal(votosUtiles.has(id), false);
  assert.equal((await votoUtil(id, "cliente")).status, 404);
  const sql = readFileSync(new URL("../prisma/migrations/20261129120000_votos_utiles_resenas/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /PRIMARY KEY \("resena_id", "usuario_id"\)/);
  assert.match(sql, /REFERENCES "resenas"\("id"\) ON DELETE CASCADE/);
  assert.match(sql, /REFERENCES "usuarios"\("idusuario"\) ON DELETE CASCADE/);
});

test("la reseña oculta sale del listado y estadísticas, su autor la puede editar y conserva sus relaciones", async () => {
  const autor = "particular-resena-oculta";
  const alta = await publicar(1, sede, autor);
  const { resena: { id } } = await alta.json();
  const fila = filas.find(resena => resena.id === id)!;
  assert.equal((await votoUtil(id, "cliente")).status, 200);
  assert.equal((await gestion("admin", `${id}/respuesta`, "POST", { texto: "Respuesta conservada" })).status, 201);
  const pagina = () => consultarPagina("pagina=1&limite=50", sede).then(res => res.json());
  const antes = await pagina();
  assert.ok(antes.resenas.some((resena: { id: string }) => resena.id === id));
  fila.visibilidad = "OCULTA";
  const oculta = await pagina();
  assert.equal(oculta.estadisticas.total, antes.estadisticas.total - 1);
  assert.equal(oculta.paginacion.total, antes.paginacion.total - 1);
  assert.ok(!oculta.resenas.some((resena: { id: string }) => resena.id === id));
  const legacy = await (await consultarPagina("", sede)).json();
  assert.ok(!legacy.resenas.some((resena: { id: string }) => resena.id === id));
  assert.equal((await votoUtil(id, "cliente")).status, 404);
  assert.equal((await gestion("admin", `${id}/respuesta`, "PATCH", { texto: "No visible" })).status, 404);
  const edicion = await misResenas(autor, "PATCH", id, { calificacion: 2, comentario: "Crítica editada" });
  assert.equal(edicion.status, 200);
  assert.equal((await edicion.json()).resena.estado_moderacion, "OCULTA");
  const mias = await (await misResenas(autor)).json();
  assert.equal(mias.resenas[0].estado_moderacion, "OCULTA");
  assert.equal(votosUtiles.get(id)?.size, 1);
  assert.equal(respuestas.get(id)?.texto, "Respuesta conservada");
  fila.visibilidad = "VISIBLE";
  const restaurada = (await pagina()).resenas.find((resena: { id: string }) => resena.id === id);
  assert.deepEqual([restaurada.calificacion, restaurada.votos_utiles, restaurada.respuesta.texto], [2, 1, "Respuesta conservada"]);
});
