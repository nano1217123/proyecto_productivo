import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createConnection } from "node:net";
import { after, test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";

const database = new URL(process.env.JJGYM_TRAINING_TEST_DATABASE ?? "");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/jjgym_training_test");
assert.ok(database.port);
process.env.DATABASE_URL = database.href;
process.env.DIRECT_URL = database.href;
process.env.JWT_SECRET = randomUUID();
process.env.GOOGLE_CLIENT_ID = "test";
process.env.GOOGLE_CLIENT_SECRET = "test";
process.env.GOOGLE_REDIRECT_URI = "http://127.0.0.1/test";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";

// Transporte de prueba para usar el cliente habitual con el PostgreSQL local.
class LocalDatabaseSocket extends EventTarget {
  private socket = createConnection(Number(database.port), database.hostname);
  constructor() {
    super();
    this.socket.on("connect", () => this.dispatchEvent(new Event("open")));
    this.socket.on("data", (data) => this.dispatchEvent(new MessageEvent("message", { data })));
    this.socket.on("error", () => this.dispatchEvent(new Event("error")));
    this.socket.on("close", () => this.dispatchEvent(new Event("close")));
  }
  send(data: Uint8Array) { this.socket.write(data); }
  close() { this.socket.end(); }
}
neonConfig.webSocketConstructor = LocalDatabaseSocket as unknown as typeof WebSocket;
neonConfig.pipelineConnect = false;
neonConfig.wsProxy = (host, port) => `${host}:${port}`;

const { default: app } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { signAccessToken } = await import("../src/lib/tokens.js");
const owner = randomUUID();
const stranger = randomUUID();
const exerciseSlug = `training-${owner}`;
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}/api`;

async function api(method: string, path: string, expected: number, body?: unknown, user: string | null = owner) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(user ? { Cookie: `access_token=${signAccessToken({ sub: user, email: `${user}@example.test` })}` } : {}),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
  return result;
}

after(async () => {
  server.close();
  try {
    await prisma.usuario.deleteMany({ where: { idusuario: { in: [owner, stranger] } } });
    await prisma.ejercicio.deleteMany({ where: { slug: exerciseSlug } });
  } finally {
    await prisma.$disconnect();
  }
});

test("sesiones autenticadas, recuperación, rutinas y cierre transaccional sobre PostgreSQL", async () => {
  await prisma.usuario.createMany({ data: [owner, stranger].map((id) => ({
    idusuario: id, nombres: "Prueba", apellidos: "Entrenamiento", correo: `${id}@example.test`,
  })) });
  const exercise = await prisma.ejercicio.create({
    data: { grupoSlug: "pecho", grupoNombre: "Pecho", nombre: "Ejercicio de prueba", slug: exerciseSlug },
  });
  const id = randomUUID();
  const ejercicio_id = Number(exercise.id);
  const baseSession = { nombre: "Entrenamiento libre", notas: "", ejercicios: [] };
  const root = "/entrenamientos";
  const active = root + "/activa";
  const path = active + "/" + id;
  await api("GET", active, 401, undefined, null);
  assert.equal((await api("GET", active, 200)).sesion, null);
  const { sesion: opened } = await api("POST", active, 200, { id, contenido: baseSession });
  assert.equal(opened.estado, "en_curso");
  assert.equal((await api("POST", active, 200, { id, contenido: baseSession })).sesion.id, id);
  await api("POST", active, 409, { id: randomUUID(), contenido: baseSession });
  assert.equal((await api("GET", active, 200, undefined, stranger)).sesion, null);

  const routine = await api("POST", "/rutinas", 201, {
    nombre: "Plantilla original", ejercicioIds: [ejercicio_id], planes: [{ tipo: "fuerza", series: 2, repeticiones: 8, descanso: 90 }],
  });
  await api("GET", `/rutinas/${routine.id}`, 404, undefined, stranger);
  const { rutina } = await api("GET", `/rutinas/${routine.id}`, 200);
  assert.equal(rutina.ejercicios[0].plan.descanso, 90);

  const modes = {
    fuerza: { peso_kg: 42.5, repeticiones: 8 },
    corporal: { repeticiones: 12 },
    carga_adicional: { peso_kg: 10, repeticiones: 6 },
    asistido: { asistencia_kg: 20, repeticiones: 7 },
    isometrico: { duracion_seg: 30 },
    cardio: { duracion_seg: 600, distancia_km: 2.25 },
    movilidad: { repeticiones: 10 },
    estiramiento: { duracion_seg: 45 },
  };
  const content = { ...baseSession, ejercicios: Object.entries(modes).map(([tipo, values]) => ({
    ejercicio_id, tipo, descanso: rutina.ejercicios[0].plan.descanso, notas: "opcional",
    series: [{ ...values, completada: true }, { completada: false }],
  })) };
  await api("PUT", path, 404, { revision: 0, contenido: content }, stranger);
  await api("POST", path + "/finalizar", 404, { revision: 0 }, stranger);
  await api("POST", path + "/cancelar", 404, { revision: 0 }, stranger);
  await api("POST", path + "/finalizar", 400, { revision: 0 });
  for (const invalid of [{ peso_kg: -1 }, { asistencia_kg: 1 }, { repeticiones: null }]) {
    const first = content.ejercicios[0];
    await api("PUT", path, 400, { revision: 0, contenido: { ...content, ejercicios: [
      { ...first, series: [{ ...first.series[0], ...invalid }] },
    ] } });
  }
  await api("PUT", path, 400, { revision: 0, contenido: { ...content, ejercicios: [
    { ...content.ejercicios[0], ejercicio_id: Number.MAX_SAFE_INTEGER },
  ] } });
  const update = { revision: 0, contenido: content };
  assert.equal((await api("PUT", path, 200, update)).sesion.revision, 1);
  assert.equal((await api("PUT", path, 200, update)).sesion.revision, 1);
  await api("PUT", path, 409, { revision: 0, contenido: baseSession });
  assert.deepEqual((await api("GET", active, 200)).sesion.sesion, content);
  assert.deepEqual((await api("GET", root, 200)).entrenamientos, []);
  const closed = await Promise.all(Array.from({ length: 3 }, () => api("POST", path + "/finalizar", 200, { revision: 1 })));
  assert.ok(closed.every((result) => result.sesion.estado === "finalizado" && result.sesion.id === id));
  assert.equal((await api("GET", active, 200)).sesion, null);

  await api("PUT", `/rutinas/${routine.id}`, 200, {
    nombre: "Plantilla editada", ejercicioIds: [ejercicio_id], planes: [{ series: 1, descanso: 30 }],
  });
  await api("DELETE", `/rutinas/${routine.id}`, 200);
  const { entrenamientos } = await api("GET", root, 200);
  assert.equal(entrenamientos.length, 1);
  assert.equal(entrenamientos[0].series.length, 8);
  const historialDetallado = await api("GET", root + "/" + id, 200);
  assert.equal(historialDetallado.sesion.ejercicios.length, 8);
  assert.equal(historialDetallado.primerasMarcas.length, 2);
  assert.equal(historialDetallado.mejoras.length, 0);
  assert.equal(entrenamientos[0].series.find((set: { tipo: string }) => set.tipo === "cardio").distancia_km, 2.25);
  assert.ok(entrenamientos[0].sesion.ejercicios.every((item: { descanso: number }) => item.descanso === 90));
  assert.deepEqual((await api("GET", root, 200, undefined, stranger)).entrenamientos, []);
  assert.equal((await api("GET", `${root}/ejercicio/${ejercicio_id}/progreso`, 200)).progreso[0].peso_max, 42.5);
  assert.deepEqual((await api("GET", `${root}/ejercicio/${ejercicio_id}/progreso`, 200, undefined, stranger)).progreso, []);
  const correction = { nombre: "Corregido", notas: "Nota revisada" };
  await api("PATCH", root + "/" + id, 404, correction, stranger);
  await api("DELETE", root + "/" + id, 404, undefined, stranger);
  await api("PATCH", root + "/" + id, 204, correction);
  assert.equal((await api("GET", root, 200)).entrenamientos[0].sesion.nombre, "Corregido");
  await api("DELETE", root + "/" + id, 200);

  const canceledId = randomUUID();
  await api("POST", active, 200, { id: canceledId, contenido: content });
  const cancelPath = `${active}/${canceledId}/cancelar`;
  assert.equal((await api("POST", cancelPath, 200, { revision: 0 })).sesion.sesion, null);
  assert.equal((await api("POST", cancelPath, 200, { revision: 0 })).sesion.estado, "cancelado");
  assert.deepEqual((await api("GET", root, 200)).entrenamientos, []);

  const legacy = { fecha: "2026-11-25", notas: "Registro previo",
    series: [{ ejercicio_id, numero_serie: 1, repeticiones: 8, peso_kg: 15 }] };
  await api("POST", root, 400, { ...legacy, fecha: "2026-02-30" });
  await api("POST", root, 201, legacy);
  const [previous] = (await api("GET", root, 200)).entrenamientos;
  assert.equal(previous.iniciadoEn, null);
  assert.equal(previous.sesion, null);
  assert.equal(previous.series[0].peso_kg, 15);
});

test("CRUD de rutinas, idempotencia, archivo y fotografía independiente del entrenamiento", async () => {
  const exercise = await prisma.ejercicio.findFirstOrThrow({ where: { slug: exerciseSlug } });
  const second = await prisma.ejercicio.create({ data: {
    nombre: "Bicicleta estática", grupoSlug: "cardio", grupoNombre: "Cardio", slug: exerciseSlug, equipo: "Bicicleta",
  } });
  const exerciseId = Number(exercise.id);
  const cardioId = Number(second.id);
  const input = {
    nombre: "Fuerza y cardio", descripcion: "Alternar ritmos", objetivo: "Resistencia",
    notas: "Hidratarse", dias: [1, 5], ejercicioIds: [exerciseId, cardioId],
    planes: [
      { tipo: "fuerza", series: 3, repeticiones: 8, repeticionesMax: 12, pesoKg: 40, descanso: 90, notas: "Controlar el descenso" },
      { tipo: "cardio", duracionSeg: 600, distanciaKm: 2 },
    ],
  };
  await api("POST", "/rutinas", 401, input, null);
  await api("POST", "/rutinas", 400, { ...input, dias: [2, 2] });
  await api("POST", "/rutinas", 400, { ...input, ejercicioIds: [exerciseId, Number.MAX_SAFE_INTEGER] });
  await api("POST", "/rutinas", 400, { ...input, planes: [{ ...input.planes[0], repeticionesMax: 5 }, input.planes[1]] });
  await api("POST", "/rutinas", 400, { ...input, planes: [input.planes[0], { tipo: "cardio", repeticiones: 4 }] });
  const solicitudId = randomUUID();
  const creates = await Promise.all([1, 2].map(() => api("POST", "/rutinas", 201, { ...input, solicitudId })));
  assert.ok(creates.every(({ id }) => id === solicitudId));
  const source = `/rutinas/${solicitudId}`;
  const { rutina } = await api("GET", source, 200);
  assert.deepEqual(rutina.dias, [1, 5]);
  assert.deepEqual(rutina.ejercicios.map(({ ejercicio_id }) => ejercicio_id), [exerciseId, cardioId]);
  const { id: copyId } = await api("POST", "/rutinas", 201, { ...input, nombre: "Una copia" });
  const copy = `/rutinas/${copyId}`;
  await api("PUT", copy, 200, { ...input, nombre: "Copia ajustada", ejercicioIds: [cardioId, exerciseId],
    planes: [...input.planes].reverse(), dias: [2, 5] });
  assert.deepEqual((await api("GET", copy, 200)).rutina.ejercicios.map(({ ejercicio_id }) => ejercicio_id), [cardioId, exerciseId]);
  assert.deepEqual((await api("GET", source, 200)).rutina, rutina);
  await api("PUT", source, 404, input, stranger);
  await api("DELETE", source, 404, undefined, stranger);
  await api("PATCH", source + "/estado", 404, { archivada: true }, stranger);
  await api("POST", source + "/iniciar", 404, { id: randomUUID() }, stranger);
  await api("PATCH", source + "/estado", 200, { archivada: true });
  assert.equal((await api("GET", "/rutinas", 200)).rutinas.some(({ id }) => id === solicitudId), false);
  assert.equal((await api("GET", "/rutinas?estado=archivadas", 200)).rutinas[0].id, solicitudId);
  await api("POST", source + "/iniciar", 409, { id: randomUUID() });
  await api("PATCH", source + "/estado", 200, { archivada: false });
  const id = randomUUID();
  const starts = await Promise.all([1, 2].map(() => api("POST", source + "/iniciar", 200, { id })));
  assert.ok(starts.every(({ sesion }) => sesion.id === id));
  await api("POST", copy + "/iniciar", 409, { id: randomUUID() });
  const snapshot = starts[0].sesion.sesion;
  assert.equal(snapshot.nombre, input.nombre);
  assert.equal(snapshot.notas, input.notas);
  assert.equal(snapshot.ejercicios[0].objetivo.repeticiones_max, 12);
  assert.equal(snapshot.ejercicios[0].objetivo.peso_kg, 40);
  assert.deepEqual(snapshot.ejercicios[0].series, Array.from({ length: 3 }, () => ({ completada: false })));
  assert.equal(snapshot.ejercicios[1].objetivo.duracion_seg, 600);
  await api("PUT", source, 200, { ...input, nombre: "Actualizada", ejercicioIds: [exerciseId], planes: [input.planes[0]] });
  assert.equal((await api("GET", source, 200)).rutina.ejercicios.length, 1);
  await api("DELETE", source, 200);
  assert.equal((await api("POST", source + "/iniciar", 200, { id })).sesion.id, id);
  assert.deepEqual((await api("GET", "/entrenamientos/activa", 200)).sesion.sesion, snapshot);
  snapshot.ejercicios[0].series[0] = { completada: true, repeticiones: 9, peso_kg: 42 };
  const active = `/entrenamientos/activa/${id}`;
  await api("PUT", active, 200, { revision: 0, contenido: snapshot });
  await api("POST", active + "/finalizar", 200, { revision: 1 });
  const saved = (await api("GET", "/entrenamientos", 200)).entrenamientos.find((item) => item.id === id);
  assert.equal(saved.series[0].peso_kg, 42);
  const detalle = await api("GET", "/entrenamientos/" + id, 200);
  assert.deepEqual(detalle.rutina, { id: solicitudId, nombre: input.nombre });
  assert.equal(saved.sesion.ejercicios[0].objetivo.peso_kg, 40);
  assert.equal((await api("GET", copy, 200)).rutina.nombre, "Copia ajustada");
  assert.equal(await prisma.ejercicio.count({ where: { slug: exerciseSlug } }), 2);
});

test("historial paginado, calendario civil, corrección, comparación, repetición y marcas privadas", async () => {
  const root = "/entrenamientos";
  const ejercicio = await prisma.ejercicio.findFirstOrThrow({ where: { slug: exerciseSlug, grupoSlug: "pecho" } });
  const ejercicio_id = Number(ejercicio.id);
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(new Date());
  const antes = await api("GET", root + "/historial", 200);
  assert.deepEqual((await api("GET", root + "/historial", 200, undefined, stranger)).entrenamientos, []);
  await api("GET", root + "/historial", 401, undefined, null);
  await api("GET", root + "/historial?desde=2026-02-30", 400);
  await api("GET", root + "/historial?pagina=0", 400);
  const ids = [randomUUID(), randomUUID()];
  for (const [index, id] of ids.entries()) {
    const contenido = { nombre: `Bitácora ${index}`, notas: "", ejercicios: [{
      ejercicio_id, tipo: "fuerza", descanso: 90, notas: "Control", series: [
        { completada: true, peso_kg: 100 + index * 10, repeticiones: 8 },
        { completada: false, peso_kg: 900, repeticiones: 8 },
      ],
    }] };
    await api("POST", root + "/activa", 200, { id, contenido });
    await api("GET", root + "/" + id, 404);
    await api("POST", root + "/activa/" + id + "/finalizar", 200, { revision: 0 });
  }
  const list = await api("GET", root + "/historial?" + new URLSearchParams({ buscar: "Bitácora", grupo: "Pecho", desde: hoy, hasta: hoy }), 200);
  assert.deepEqual(list.entrenamientos.map((item) => [item.id, item.series, item.volumen]), [[ids[1], 1, 880], [ids[0], 1, 800]]);
  assert.equal((await api("GET", root + "/historial?" + new URLSearchParams({ buscar: ejercicio.nombre }), 200)).entrenamientos.length,
    antes.entrenamientos.length + 2);
  assert.equal((await api("GET", root + "/historial?" + new URLSearchParams({ buscar: "Bitácora", records: "true" }), 200)).entrenamientos[0].id, ids[1]);
  const actividad = root + "/actividad?" + new URLSearchParams({ desde: hoy, hasta: hoy, hoy, semana: hoy, mes: hoy });
  assert.ok((await api("GET", actividad, 200)).dias[0].sesiones >= 2);
  assert.equal((await api("GET", actividad, 200, undefined, stranger)).resumen.total, 0);
  const origen = root + "/" + ids[1];
  const detalle = await api("GET", origen, 200);
  assert.equal(detalle.sesion.ejercicios[0].series.length, 1);
  assert.equal(detalle.mejoras.length, 1);
  await api("GET", origen, 404, undefined, stranger);
  const comparar = root + "/comparar?" + new URLSearchParams({ anterior: ids[0], reciente: ids[1] });
  assert.equal((await api("GET", comparar, 200)).general.Volumen.cambio, 80);
  await api("GET", comparar, 404, undefined, stranger);
  const distinto = randomUUID();
  await api("POST", root + "/activa", 200, { id: distinto, contenido: { nombre: "Isometría", notas: "",
    ejercicios: [{ ejercicio_id, tipo: "isometrico", descanso: 20, notas: "", series: [{ completada: true, duracion_seg: 20 }] }],
  } });
  await api("POST", root + "/activa/" + distinto + "/finalizar", 200, { revision: 0 });
  const incompatibles = root + "/comparar?" + new URLSearchParams({ anterior: ids[0], reciente: distinto });
  const comparacionSinCarga = await api("GET", incompatibles, 200);
  assert.equal(comparacionSinCarga.general.Volumen.cambio, null);
  assert.deepEqual(comparacionSinCarga.ejercicios, []);
  await api("DELETE", root + "/" + distinto, 200);
  await prisma.ejercicio.update({ where: { id: ejercicio.id }, data: { nombre: "Nombre actualizado del catálogo" } });
  assert.equal((await api("GET", origen, 200)).catalogo[ejercicio_id].nombre, ejercicio.nombre);
  const repeat = { id: randomUUID() };
  await api("POST", origen + "/repetir", 404, repeat, stranger);
  const repeats = await Promise.all([1, 2].map(() => api("POST", origen + "/repetir", 200, repeat)));
  assert.ok(repeats.every(({ sesion }) => sesion.id === repeat.id && !sesion.sesion.ejercicios[0].series[0].completada));
  await api("POST", origen + "/repetir", 409, { id: randomUUID() });
  await api("POST", root + "/activa/" + repeat.id + "/cancelar", 200, { revision: 0 });
  const edit = { fecha: hoy, revision: detalle.revision, contenido: detalle.sesion };
  edit.contenido.ejercicios[0].series[0].peso_kg = 90;
  await api("PATCH", origen, 404, edit, stranger);
  await api("PATCH", origen, 204, edit);
  await api("PATCH", origen, 409, edit);
  assert.equal((await api("GET", origen, 200)).mejoras.length, 0);
  assert.equal((await api("GET", comparar, 200)).general.Volumen.cambio, -80);
  await api("DELETE", root + "/" + ids[0], 200);
  await api("GET", root + "/" + ids[0], 404);
  const restante = await api("GET", origen, 200);
  assert.equal(restante.sesion.ejercicios[0].series[0].peso_kg, 90);
  assert.equal(restante.mejoras.length, 1);
  await api("DELETE", origen, 200);

  const many = Array.from({ length: 1012 }, () => ({
    id: randomUUID(), usuarioId: stranger, fecha: new Date(hoy), nombre: "Paginación",
  }));
  await prisma.entrenamiento.createMany({ data: many });
  const first = await api("GET", root + "/historial", 200, undefined, stranger);
  const second = await api("GET", root + "/historial?pagina=2", 200, undefined, stranger);
  assert.equal(first.entrenamientos.length, 20);
  assert.equal(first.siguiente, true);
  assert.equal(second.entrenamientos.length, 20);
  assert.ok(!second.entrenamientos.some(({ id }) => first.entrenamientos.some((row) => row.id === id)));
  assert.equal((await api("GET", root + "/historial?pagina=51", 200, undefined, stranger)).entrenamientos.length, 12);
});
