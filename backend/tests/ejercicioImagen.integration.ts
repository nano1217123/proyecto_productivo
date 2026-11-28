import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createConnection } from "node:net";
import { after, test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";
import { v2 as cloudinary } from "cloudinary";

const database = new URL(process.env.JJGYM_IMAGENES_TEST_DATABASE ?? "");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/jjgym_imagenes_test");
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

// Ninguna operación de este flujo debe llegar a Cloudinary.
const llamadasCloudinary: string[] = [];
for (const [objeto, metodos] of [
  [cloudinary.uploader, ["destroy", "upload", "upload_stream", "rename"]],
  [cloudinary.api, ["delete_resources", "delete_resources_by_prefix", "delete_all_resources", "delete_resources_by_tag"]],
] as const) {
  for (const metodo of metodos) {
    (objeto as unknown as Record<string, unknown>)[metodo] = (...args: unknown[]) => {
      llamadasCloudinary.push(`${metodo}(${JSON.stringify(args[0])})`);
      throw new Error("Cloudinary no debe usarse al quitar una imagen.");
    };
  }
}

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

const cuentas = {
  admin: randomUUID(), super_admin: randomUUID(), admin_gimnasio: randomUUID(),
  cliente: randomUUID(), usuario_particular: randomUUID(),
};
type Rol = keyof typeof cuentas;
const prefijo = `imagen-${randomUUID()}`;
const nube = "https://res.cloudinary.com/test/image/upload";
const COMPARTIDA = `${nube}/v1/jjgym/b3ig6gyzsmb5kznvjowg.jpg`;
const ROTA = `${nube}/v1/jjgym/hx2moyodb4ekanw7tfq0.jpg`;
const ORIGINAL = `${nube}/v1/jjgym/original.jpg`;
const REEMPLAZO = `${nube}/v2/jjgym/reemplazo.jpg`;

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}/api`;

async function api(method: string, path: string, body?: unknown, rol: Rol | null = "admin") {
  const user = rol ? cuentas[rol] : null;
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(user ? { Cookie: `access_token=${signAccessToken({ sub: user, email: `${user}@example.test` })}` } : {}),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.match(response.headers.get("content-type") ?? "", /application\/json/, `${method} ${path} responde JSON`);
  return { status: response.status, body: await response.json() };
}
async function esperar(method: string, path: string, status: number, body?: unknown, rol: Rol | null = "admin") {
  const r = await api(method, path, body, rol);
  assert.equal(r.status, status, `${method} ${path} (${rol}): ${JSON.stringify(r.body)}`);
  return r.body;
}
const quitar = (id: bigint | string, imagenActual: unknown, rol: Rol | null = "admin") =>
  api("DELETE", `/ejercicios/${id}/imagen`, imagenActual === undefined ? {} : { imagenActual }, rol);
const imagenDe = async (id: bigint) => (await prisma.ejercicio.findUniqueOrThrow({ where: { id } })).imagenUrl;

after(async () => {
  server.close();
  try {
    await prisma.usuario.deleteMany({ where: { idusuario: { in: Object.values(cuentas) } } });
    await prisma.ejercicio.deleteMany({ where: { slug: { startsWith: prefijo } } });
  } finally {
    await prisma.$disconnect();
  }
});

test("quitar la imagen de un ejercicio: permisos, concurrencia, imágenes compartidas e historial", async () => {
  await prisma.usuario.createMany({ data: (Object.entries(cuentas) as [Rol, string][]).map(([tipoUsuario, idusuario]) => ({
    idusuario, tipoUsuario, nombres: "Prueba", apellidos: tipoUsuario, correo: `${idusuario}@example.test`,
  })) });
  const crear = (nombre: string, imagenUrl: string | null) => prisma.ejercicio.create({ data: {
    grupoSlug: "pecho", grupoNombre: "Pecho", nombre, slug: `${prefijo}-${nombre.toLowerCase().replaceAll(" ", "-")}`, imagenUrl,
  } });
  const banca = await crear("Press de banca", COMPARTIDA);
  const inclinado = await crear("Press inclinado con mancuernas", COMPARTIDA);
  const aperturas = await crear("Aperturas con mancuernas", ROTA);
  const remo = await crear("Remo con barra", ORIGINAL);
  const sinImagen = await crear("Fondos", null);

  // Una sesión finalizada guarda en el historial la imagen vigente.
  const sesionId = randomUUID();
  const contenido = { nombre: "Pecho", notas: "", ejercicios: [banca, aperturas].map((e) => ({
    ejercicio_id: Number(e.id), tipo: "fuerza", descanso: 90, notas: "",
    series: [{ peso_kg: 40, repeticiones: 8, completada: true }],
  })) };
  await esperar("POST", "/entrenamientos/activa", 200, { id: sesionId, contenido }, "usuario_particular");
  await esperar("POST", `/entrenamientos/activa/${sesionId}/finalizar`, 200, { revision: 0 }, "usuario_particular");
  const historialAntes = (await prisma.entrenamiento.findUniqueOrThrow({ where: { id: sesionId } })).catalogoHistorico;
  assert.equal((historialAntes as Record<string, { imagen: string }>)[String(banca.id)].imagen, COMPARTIDA);

  // Permisos: los mismos que para asignar.
  assert.equal((await quitar(banca.id, COMPARTIDA, null)).status, 401);
  for (const rol of ["cliente", "usuario_particular", "admin_gimnasio"] as const) {
    assert.equal((await quitar(banca.id, COMPARTIDA, rol)).status, 403, rol);
  }
  assert.equal(await imagenDe(banca.id), COMPARTIDA, "un rechazo no cambia nada");

  // Validación de la petición y existencia del ejercicio.
  for (const id of ["abc", "0", "1.5", "-3", "1e3", "9".repeat(19)]) {
    assert.equal((await quitar(id, COMPARTIDA)).status, 400, `id ${id}`);
  }
  assert.equal((await quitar(banca.id, undefined)).status, 400, "sin imagenActual");
  assert.equal((await quitar(banca.id, "")).status, 400, "imagenActual vacía");
  assert.equal((await quitar(banca.id, 7)).status, 400, "imagenActual no es texto");
  assert.equal((await api("DELETE", `/ejercicios/${banca.id}/imagen`, { imagenActual: COMPARTIDA, otra: 1 })).status, 400, "campos extra");
  const inexistente = await quitar(BigInt(remo.id) + 100000n, ORIGINAL);
  assert.deepEqual([inexistente.status, inexistente.body.message], [404, "El ejercicio no existe."]);
  const vacio = await quitar(sinImagen.id, ORIGINAL);
  assert.deepEqual([vacio.status, vacio.body.imagenUrl], [409, null], "un ejercicio sin imagen no tiene nada que quitar");

  // Imagen compartida: solo se quita del ejercicio indicado.
  const quitada = await quitar(banca.id, COMPARTIDA);
  assert.deepEqual([quitada.status, quitada.body], [200, { message: "Imagen quitada del ejercicio.", imagenUrl: null }]);
  assert.equal(await imagenDe(banca.id), null);
  assert.equal(await imagenDe(inclinado.id), COMPARTIDA, "el otro ejercicio conserva la imagen");
  const { grupos } = await esperar("GET", "/ejercicios", 200, undefined, null);
  const catalogo = grupos.flatMap((g: { ejercicios: { id: number; imagen_url: string | null }[] }) => g.ejercicios);
  assert.equal(catalogo.find((e: { id: number }) => e.id === Number(banca.id)).imagen_url, null);
  assert.equal(catalogo.find((e: { id: number }) => e.id === Number(inclinado.id)).imagen_url, COMPARTIDA);

  // El historial conserva su copia de la imagen.
  const historialDespues = (await prisma.entrenamiento.findUniqueOrThrow({ where: { id: sesionId } })).catalogoHistorico;
  assert.deepEqual(historialDespues, historialAntes);
  const detalle = await esperar("GET", `/entrenamientos/${sesionId}`, 200, undefined, "usuario_particular");
  assert.equal(detalle.catalogo[String(banca.id)].imagen, COMPARTIDA);

  // Repetir la operación: la imagen ya no es la que se vio.
  const repetida = await quitar(banca.id, COMPARTIDA);
  assert.equal(repetida.status, 409);
  assert.equal(repetida.body.imagenUrl, null);
  assert.match(repetida.body.message, /ya quitó/);

  // Otro administrador reemplaza la imagen mientras se confirma.
  await esperar("PATCH", `/ejercicios/${remo.id}/imagen`, 200, { imagenUrl: REEMPLAZO }, "admin");
  const conflicto = await quitar(remo.id, ORIGINAL, "super_admin");
  assert.equal(conflicto.status, 409);
  assert.equal(conflicto.body.imagenUrl, REEMPLAZO, "la respuesta trae la imagen vigente");
  assert.match(conflicto.body.message, /cambió la imagen/);
  assert.equal(await imagenDe(remo.id), REEMPLAZO, "el reemplazo no se pierde");
  assert.equal((await quitar(remo.id, REEMPLAZO, "super_admin")).status, 200, "super_admin puede quitarla");

  // Dos confirmaciones simultáneas: solo una quita la imagen.
  const simultaneas = await Promise.all([quitar(aperturas.id, ROTA, "admin"), quitar(aperturas.id, ROTA, "super_admin")]);
  assert.deepEqual(simultaneas.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await imagenDe(aperturas.id), null);

  assert.deepEqual(llamadasCloudinary, [], "el archivo remoto se conserva");
});
