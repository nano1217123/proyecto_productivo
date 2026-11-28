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
