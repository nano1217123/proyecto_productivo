import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createConnection } from "node:net";
import { after, test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";

const database = new URL(process.env.JJGYM_NUTRITION_TEST_DATABASE ?? "");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/jjgym_nutrition_test");
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
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}/api/nutricion`;

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
  try { await prisma.usuario.deleteMany({ where: { idusuario: { in: [owner, stranger] } } }); }
  finally { await prisma.$disconnect(); }
});

test("flujo nutricional con autenticación, PostgreSQL, historial y snapshots", async () => {
  await prisma.usuario.createMany({ data: [owner, stranger].map((id) => ({
    idusuario: id, nombres: "Prueba", apellidos: "Nutrición", correo: `${id}@example.test`,
  })) });
  await prisma.metricaDiaria.create({ data: { usuarioId: owner, pesoActualKg: 70 } });
  await api("GET", "/perfil", 401, undefined, null);
  const initial = await api("GET", "/perfil", 200);
  assert.equal(initial.settings, null);
  assert.equal(initial.weight, 70);
  const data = {
    birthYear: 1990, goal: "mantener", activity: "regular", zone: "America/Bogota",
    preference: "vegetariana", allergens: ["huevo"], needsProfessional: false, tracking: true,
  };
  await api("PATCH", "/perfil", 400, { ...data, usuarioId: stranger });
  const saved = await api("PATCH", "/perfil", 200, data);
  const today = saved.today;
  assert.equal(saved.reference.minimum, 98);
  assert.equal(saved.reference.maximum, 140);
  assert.equal(await prisma.metricaDiaria.count({ where: { usuarioId: owner } }), 1);

  const { items } = await api("GET", "/alimentos?q=frijoles&origin=vegetal&compatible=true&sort=proteina", 200);
  assert.equal(items[0].id, 173735);
  assert.equal((await api("GET", "/alimentos/173424", 200)).units.unidad, 50);
  const recommended = await api("GET", "/recomendaciones", 200);
  assert.ok(recommended.length > 0 && recommended.every((item: { allergens: string[] }) => !item.allergens.includes("huevo")));

  await api("PUT", "/favoritos/173424", 204);
  assert.equal((await api("GET", "/alimentos?favorite=true", 200)).total, 1);
  assert.equal((await api("GET", "/alimentos?favorite=true", 200, undefined, stranger)).total, 0);
  await api("DELETE", "/favoritos/173424", 204);
  assert.equal((await api("GET", "/alimentos?favorite=true", 200)).total, 0);

  const food = { foodId: 173424, unit: "unidad", quantity: 2 };
  const entry = { ...food, day: today, meal: "Desayuno" };
  await api("POST", "/registros", 400, { ...entry, quantity: -1 });
  await api("POST", "/registros", 400, { ...entry, unit: "ml" });
  assert.equal((await api("POST", "/aporte", 200, food)).protein, 12.58);
  const requestId = randomUUID();
  const recorded = await api("POST", "/registros", 201, { ...entry, requestId });
  assert.equal((await api("POST", "/registros", 201, { ...entry, requestId })).id, recorded.id);
  await api("POST", "/registros", 409, { ...entry, requestId, quantity: 1 });
  assert.equal(recorded.protein, 12.58);
  const lentils = await api("POST", "/registros", 201, { ...entry, foodId: 172421, unit: "taza", quantity: .5 });
  const path = "/registros/" + recorded.id;
  await api("PATCH", path, 404, entry, stranger);
  await api("DELETE", path, 404, undefined, stranger);
  await api("POST", "/aporte/" + recorded.id, 404, food, stranger);
  assert.equal((await api("GET", "/registros?day=" + today, 200, undefined, stranger)).total, 0);
  assert.equal((await api("GET", "/registros?day=" + today, 200)).days[0].protein, 21.51);
  const previousDate = new Date(today + "T00:00:00Z");
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const previousDay = previousDate.toISOString().slice(0, 10);
  const lentilData = { ...entry, foodId: 172421, unit: "taza", quantity: .5 };
  await api("PATCH", "/registros/" + lentils.id, 200, { ...lentilData, day: previousDay });
  assert.equal((await api("GET", "/registros?day=" + previousDay, 200)).days[0].protein, 8.93);
  assert.equal((await api("GET", "/registros?day=" + today, 200)).days[0].protein, 12.58);
  await api("PATCH", "/registros/" + lentils.id, 200, lentilData);
  const original = { ...recorded.snapshot };
  const { findFood } = await import("../src/nutrition/catalog.js");
  const liveFood = findFood(173424);
  const originalProtein = liveFood.protein;
  try {
    liveFood.protein = 99;
    const edited = await api("PATCH", path, 200, { ...entry, quantity: 3, meal: "Cena" });
    assert.equal(edited.protein, 18.87);
    assert.deepEqual(edited.snapshot, original);
  } finally { liveFood.protein = originalProtein; }

  await api("PATCH", "/perfil", 200, { ...data, goal: "aumentar" });
  await api("PATCH", "/perfil", 200, { ...data, goal: "reducir", weight: 75 });
  for (const days of [7, 30]) {
    const history = await api("GET", `/registros?day=${today}&days=${days}`, 200);
    assert.equal(history.days.length, days);
    assert.equal(history.daysRecorded, 1);
    assert.equal(history.days[0].protein, null);
    assert.equal(history.days.at(-1).protein, 27.8);
    assert.deepEqual(history.references.map((item: { goal: string }) => item.goal), ["reducir", "aumentar", "mantener"]);
  }
  await prisma.metricaDiaria.create({ data: { usuarioId: owner, pesoActualKg: 80 } });
  const refreshed = await api("GET", "/perfil", 200);
  assert.equal(refreshed.reference.minimum, 112);
  assert.equal(refreshed.reference.goal, "reducir");
  await api("DELETE", path, 204);
  await api("DELETE", "/registros/" + lentils.id, 204);
  assert.equal((await api("GET", "/registros?day=" + today, 200)).days[0].protein, null);
  const disabled = await api("PATCH", "/perfil", 200, { ...data, tracking: false, needsProfessional: true });
  assert.equal(disabled.reference.minimum, null);
  assert.deepEqual(await api("GET", "/recomendaciones", 200), []);
  await api("POST", "/registros", 409, entry);
});
