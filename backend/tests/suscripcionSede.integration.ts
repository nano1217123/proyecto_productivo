// Suscripción SaaS por sede de punta a punta sobre PostgreSQL aislado, con
// la API de Wompi simulada por HTTP. El backend real verifica cada
// transacción contra ese servidor con la llave privada de prueba.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { createConnection } from "node:net";
import { after, before, test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";

const database = new URL(process.env.JJGYM_SUSCRIPCIONES_TEST_DATABASE ?? "");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/jjgym_suscripciones_test");
assert.ok(database.port);

// --- Wompi simulado ------------------------------------------------------
const LLAVE_PRIVADA = "prv_test_integracion";
type Tx = { id: string; reference: string; status: string; amount_in_cents: number; currency: string; finalized_at?: string };
const transacciones = new Map<string, Tx>();
const llamadasWompi: string[] = [];
const wompi = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://wompi.test");
  llamadasWompi.push(`${req.method} ${url.pathname}${url.search}`);
  const json = (status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.headers.authorization !== `Bearer ${LLAVE_PRIVADA}`) return json(401, { error: "llave" });
  const porId = url.pathname.match(/^\/v1\/transactions\/([^/]+)$/);
  if (porId) {
    const tx = transacciones.get(decodeURIComponent(porId[1]));
    return tx ? json(200, { data: tx }) : json(404, { error: "NOT_FOUND" });
  }
  if (url.pathname === "/v1/transactions") {
    const ref = url.searchParams.get("reference");
    return json(200, { data: [...transacciones.values()].filter((t) => t.reference === ref) });
  }
  json(404, {});
});
wompi.listen(0, "127.0.0.1");
await once(wompi, "listening");
const puertoWompi = (wompi.address() as { port: number }).port;

Object.assign(process.env, {
  DATABASE_URL: database.href,
  DIRECT_URL: database.href,
  JWT_SECRET: randomUUID(),
  GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", GOOGLE_REDIRECT_URI: "http://127.0.0.1/test",
  CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test",
  RESEND_API_KEY: "",
  WOMPI_PUBLIC_KEY: "pub_test_integracion",
  WOMPI_INTEGRITY_SECRET: "test_integrity_integracion",
  WOMPI_EVENTS_SECRET: "test_events_integracion",
  WOMPI_PRIVATE_KEY: LLAVE_PRIVADA,
  WOMPI_API_URL: `http://127.0.0.1:${puertoWompi}/v1`,
  WOMPI_REDIRECT_URL: "https://app.jjgym.example/dashboard/pagos/resultado",
  USD_COP_TASA: "4000",
});

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
const { calcularChecksumEvento } = await import("../src/lib/wompi.js");
const { sumarMesCalendario, diaDelMesEnColombia } = await import("../src/lib/suscripcionSede.js");

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;

// --- Datos de prueba -----------------------------------------------------
const SEDE_P = "jj-poblado";
const SEDE_L = "power-laureles";
const SEDE_B = "fit-belen";
const MONTO_SEDE = 150_00 * 4000; // 150 USD × 4000 = 60.000.000 centavos = $600.000 COP
const MONTO_PARTICULAR = 10_00 * 4000;
const cuentas = {
  adminP: randomUUID(), adminP2: randomUUID(), adminL: randomUUID(), adminB: randomUUID(),
  particular: randomUUID(), cliente: randomUUID(),
};
type Cuenta = keyof typeof cuentas;
const roles: Record<Cuenta, string> = {
  adminP: "admin", adminP2: "admin", adminL: "admin", adminB: "admin", particular: "usuario_particular", cliente: "cliente",
};
const co = (local: string) => new Date(`${local}-05:00`);
const AHORA = Date.now();

async function api(method: string, path: string, cuenta: Cuenta | null, body?: unknown, headers: Record<string, string> = {}) {
  const id = cuenta ? cuentas[cuenta] : null;
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(id ? { Cookie: `access_token=${signAccessToken({ sub: id, email: `${id}@example.test` })}` } : {}),
      "Content-Type": "application/json", ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
async function esperar(status: number, p: Promise<{ status: number; body: any }>, contexto: string) {
  const r = await p;
  assert.equal(r.status, status, `${contexto}: ${JSON.stringify(r.body)}`);
  return r.body;
}

async function checkout(cuenta: Cuenta, gymSlug: string | null, monto = MONTO_SEDE) {
  const r = await esperar(201, api("POST", "/pagos/wompi/checkout", cuenta, { ...(gymSlug ? { gymSlug } : {}), montoEnCentavos: monto }), `checkout ${cuenta} ${gymSlug}`);
  return r as { pago: { referencia: string; monto_en_centavos: number; gym_slug: string | null }; checkoutUrl: string };
}

function transaccion(referencia: string, status: string, finalizadaEn: Date | null, extra: Partial<Tx> = {}): Tx {
  const tx: Tx = { id: `tx-${randomUUID()}`, reference: referencia, status, amount_in_cents: MONTO_SEDE, currency: "COP",
    ...(finalizadaEn ? { finalized_at: finalizadaEn.toISOString() } : {}), ...extra };
  transacciones.set(tx.id, tx);
  return tx;
}

let reloj = Math.floor(AHORA / 1000);
function evento(tx: Tx, opciones: { environment?: string; cambio?: Partial<Tx>; firmaMala?: boolean } = {}) {
  const transaction = { ...tx, ...(opciones.cambio ?? {}) };
  const ev = {
    event: "transaction.updated",
    data: { transaction },
    environment: opciones.environment ?? "test",
    signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum: "" },
    timestamp: ++reloj,
    sent_at: new Date().toISOString(),
  };
  ev.signature.checksum = opciones.firmaMala ? "0".repeat(64) : calcularChecksumEvento(ev as any, "test_events_integracion")!;
  return ev;
}
const webhook = (tx: Tx, opciones?: Parameters<typeof evento>[1]) => api("POST", "/pagos/wompi/webhook", null, evento(tx, opciones));

const pagoDb = (referencia: string) => prisma.pagoIntento.findUniqueOrThrow({ where: { referencia } });
const periodos = (gymSlug: string) => prisma.suscripcionSedePeriodo.findMany({ where: { gymSlug }, orderBy: { desde: "asc" } });
const vigencia = async (gymSlug: string) => (await prisma.suscripcionSede.findUnique({ where: { gymSlug } }))?.vigenteHasta ?? null;
const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

async function limpiar() {
  await prisma.$executeRawUnsafe(`TRUNCATE suscripciones_sede_periodos, suscripciones_sede, pagos_transacciones_revision, pagos_intentos, admin_sedes CASCADE`);
  await prisma.usuario.deleteMany({ where: { idusuario: { in: Object.values(cuentas) } } });
}

before(async () => {
  // Neon usa la zona GMT. El adaptador de Prisma para Neon envía y lee las
  // fechas sin zona horaria, así que una base local con otra zona guarda
  // las fechas desplazadas aunque la aplicación las lea bien.
  const [{ zona }] = await prisma.$queryRaw<{ zona: string }[]>`SELECT current_setting('TimeZone') AS zona`;
  assert.ok(["GMT", "UTC", "Etc/UTC"].includes(zona),
    `La base de prueba usa la zona "${zona}". Ejecuta: ALTER DATABASE jjgym_suscripciones_test SET timezone TO 'GMT'`);
  await limpiar();
  await prisma.usuario.createMany({ data: (Object.keys(cuentas) as Cuenta[]).map((c) => ({
    idusuario: cuentas[c], nombres: "Prueba", apellidos: c, correo: `${cuentas[c]}@example.test`, tipoUsuario: roles[c],
  })) });
  await prisma.adminSede.createMany({ data: [
    { usuarioId: cuentas.adminP, gymSlug: SEDE_P }, { usuarioId: cuentas.adminP2, gymSlug: SEDE_P },
    { usuarioId: cuentas.adminL, gymSlug: SEDE_L }, { usuarioId: cuentas.adminB, gymSlug: SEDE_B },
  ].map((d) => ({ ...d, id: randomUUID() })) });
});

after(async () => {
  server.close();
  wompi.close();
  try { await limpiar(); } finally { await prisma.$disconnect(); }
});

// La vigencia de la sede P se encadena a lo largo de los escenarios.
let esperadoP: Date;
let diaCorteP: number;
const siguienteP = () => (esperadoP = sumarMesCalendario(esperadoP, diaCorteP));

test("primer pago aprobado: activa la sede con un mes desde la aprobación y muestra $600.000", async () => {
  const opciones = (await esperar(200, api("GET", "/pagos/opciones", "adminP"), "opciones")).opciones;
  assert.equal(opciones.length, 1);
  assert.deepEqual([opciones[0].gym_slug, opciones[0].monto_en_centavos, opciones[0].tasa_usd_cop, opciones[0].suscripcion.estado, opciones[0].suscripcion.vigente_hasta],
    [SEDE_P, 60_000_000, "4000", "sin_suscripcion", null]);

  const { pago, checkoutUrl } = await checkout("adminP", SEDE_P);
  const url = new URL(checkoutUrl);
  assert.equal(url.searchParams.get("amount-in-cents"), "60000000");
  assert.equal(url.searchParams.get("currency"), "COP");
  assert.equal(url.searchParams.get("signature:integrity"),
    createHash("sha256").update(`${pago.referencia}60000000COPtest_integrity_integracion`).digest("hex"));
  assert.equal(new URL(url.searchParams.get("redirect-url")!).searchParams.get("referencia"), pago.referencia);
  assert.equal((await pagoDb(pago.referencia)).ambiente, "test");

  const aprobadoEn = new Date(AHORA - 60 * 60 * 1000);
  const tx = transaccion(pago.referencia, "APPROVED", aprobadoEn);
  assert.equal((await esperar(200, webhook(tx), "webhook")).resultado, "aplicado");

  diaCorteP = diaDelMesEnColombia(aprobadoEn);
  esperadoP = sumarMesCalendario(aprobadoEn, diaCorteP);
  const [p1] = await periodos(SEDE_P);
  assert.deepEqual([p1.tipo, iso(p1.desde), iso(p1.hasta), p1.wompiTransaccionId], ["activacion", iso(aprobadoEn), iso(esperadoP), tx.id]);
  assert.equal(iso(await vigencia(SEDE_P)), iso(esperadoP));

  const estado = (await esperar(200, api("GET", `/pagos/estado?referencia=${pago.referencia}`, "adminP"), "estado")).pago;
  assert.equal(estado.estado, "APROBADO");
  assert.deepEqual([estado.gym_slug, estado.suscripcion.estado, iso(estado.suscripcion.vigente_hasta), estado.suscripcion.periodo_pago.tipo],
    [SEDE_P, "activa", iso(esperadoP), "activacion"]);
  const despues = (await esperar(200, api("GET", "/pagos/opciones", "adminP"), "opciones")).opciones[0];
  assert.deepEqual([despues.suscripcion.estado, iso(despues.suscripcion.vigente_hasta)], ["activa", iso(esperadoP)]);

  // Eventos repetidos y conciliación posterior: no suman vigencia.
  assert.equal((await esperar(200, webhook(tx), "repetido")).resultado, "duplicado");
  assert.equal((await esperar(200, webhook(tx), "repetido 2")).resultado, "duplicado");
  const conciliado = await esperar(200, api("POST", "/pagos/conciliar", "adminP", { referencia: pago.referencia }), "conciliar");
  assert.equal(conciliado.conciliacion, "no_necesaria");
  assert.equal(conciliado.pago.suscripcion.periodo_pago.tipo, "activacion");
  assert.equal((await periodos(SEDE_P)).length, 1);
  assert.equal(iso(await vigencia(SEDE_P)), iso(esperadoP));
});

test("sede vencida: el nuevo pago cuenta desde la aprobación (reactivación)", async () => {
  const primero = await checkout("adminL", SEDE_L);
  const antiguo = co("2026-01-15T10:00:00");
  await esperar(200, webhook(transaccion(primero.pago.referencia, "APPROVED", antiguo)), "pago antiguo");
  assert.equal(iso(await vigencia(SEDE_L)), iso(co("2026-02-15T10:00:00")));
  // Lo guardado en PostgreSQL, leído sin Prisma, es la misma hora de Colombia.
  const [crudo] = await prisma.$queryRaw<{ local: string }[]>`
    SELECT to_char(vigente_hasta AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI') AS local
    FROM suscripciones_sede WHERE gym_slug = ${SEDE_L}`;
  assert.equal(crudo.local, "2026-02-15 10:00");
  const opcion = (await esperar(200, api("GET", "/pagos/opciones", "adminL"), "opciones L")).opciones[0];
  assert.equal(opcion.suscripcion.estado, "vencida");

  const segundo = await checkout("adminL", SEDE_L);
  const aprobadoEn = new Date(AHORA - 5 * 60 * 1000);
  await esperar(200, webhook(transaccion(segundo.pago.referencia, "APPROVED", aprobadoEn)), "reactivación");
  const [, p2] = await periodos(SEDE_L);
  const hasta = sumarMesCalendario(aprobadoEn, diaDelMesEnColombia(aprobadoEn));
  assert.deepEqual([p2.tipo, iso(p2.desde), iso(p2.hasta)], ["reactivacion", iso(aprobadoEn), iso(hasta)]);
  assert.equal(iso(await vigencia(SEDE_L)), iso(hasta));
});

test("renovación anticipada: cuenta desde el vencimiento actual y no toca otras sedes", async () => {
  const vigenciaL = iso(await vigencia(SEDE_L));
  const vencimientoAnterior = esperadoP;
  const { pago } = await checkout("adminP", SEDE_P);
  await esperar(200, webhook(transaccion(pago.referencia, "APPROVED", new Date(AHORA))), "renovación");
  siguienteP();
  const p = (await periodos(SEDE_P)).at(-1)!;
  assert.deepEqual([p.tipo, iso(p.desde), iso(p.hasta)], ["renovacion", iso(vencimientoAnterior), iso(esperadoP)]);
  assert.equal(iso(await vigencia(SEDE_P)), iso(esperadoP));
  assert.equal(iso(await vigencia(SEDE_L)), vigenciaL, "la otra sede conserva su vigencia");
});

test("finales de mes: aprobación el 31 de enero a las 23:30 de Colombia", async () => {
  const primero = await checkout("adminB", SEDE_B);
  await esperar(200, webhook(transaccion(primero.pago.referencia, "APPROVED", co("2027-01-31T23:30:00"))), "31 ene");
  assert.equal(iso(await vigencia(SEDE_B)), "2027-03-01T04:30:00.000Z", "vence el 28 feb 23:30 en Colombia");
  const segundo = await checkout("adminB", SEDE_B);
  await esperar(200, webhook(transaccion(segundo.pago.referencia, "APPROVED", co("2027-02-10T09:00:00"))), "renovación");
  const [p1, p2] = await periodos(SEDE_B);
  assert.equal(p1.tipo, "activacion");
  assert.deepEqual([p2.tipo, iso(p2.desde), iso(p2.hasta)], ["renovacion", "2027-03-01T04:30:00.000Z", "2027-04-01T04:30:00.000Z"],
    "conserva el día de corte 31: vence el 31 mar 23:30 en Colombia");
  assert.equal((await prisma.suscripcionSede.findUniqueOrThrow({ where: { gymSlug: SEDE_B } })).diaCorte, 31);
});

test("un administrador no puede consultar ni pagar una sede ajena", async () => {
  const { pago } = await checkout("adminP", SEDE_P);
  await esperar(404, api("GET", `/pagos/estado?referencia=${pago.referencia}`, "adminL"), "estado ajeno");
  await esperar(404, api("POST", "/pagos/conciliar", "adminL", { referencia: pago.referencia }), "conciliar ajeno");
  await esperar(403, api("POST", "/pagos/wompi/checkout", "adminL", { gymSlug: SEDE_P, montoEnCentavos: MONTO_SEDE }), "checkout ajeno");
  const opcionesL = (await esperar(200, api("GET", "/pagos/opciones", "adminL"), "opciones L")).opciones;
  assert.deepEqual(opcionesL.map((o: { gym_slug: string }) => o.gym_slug), [SEDE_L]);
  await esperar(403, api("GET", "/pagos/opciones", "cliente"), "cliente");
  await esperar(401, api("GET", "/pagos/opciones", null), "sin sesión");
  // Ese intento sigue pendiente: se usa en el escenario siguiente.
  pendienteP = pago.referencia;
});
let pendienteP = "";

test("pendiente, rechazado y error conservan la vigencia anterior", async () => {
  const antes = iso(await vigencia(SEDE_P));
  const cuantos = (await periodos(SEDE_P)).length;
  const pendiente = transaccion(pendienteP, "PENDING", null);
  await esperar(200, webhook(pendiente), "pendiente");
  assert.equal((await pagoDb(pendienteP)).estado, "PENDIENTE");
  const rechazada = { ...pendiente, status: "DECLINED", finalized_at: new Date(AHORA).toISOString() };
  transacciones.set(rechazada.id, rechazada);
  await esperar(200, webhook(rechazada), "rechazo");
  assert.equal((await pagoDb(pendienteP)).estado, "RECHAZADO");

  const conError = await checkout("adminP", SEDE_P);
  await esperar(200, webhook(transaccion(conError.pago.referencia, "ERROR", new Date(AHORA))), "error");
  assert.equal((await pagoDb(conError.pago.referencia)).estado, "ERROR");
  assert.equal((await periodos(SEDE_P)).length, cuantos);
  assert.equal(iso(await vigencia(SEDE_P)), antes);
});

test("datos que no coinciden con el intento no cambian nada", async () => {
  const { pago } = await checkout("adminP", SEDE_P);
  const antes = iso(await vigencia(SEDE_P));
  const tx = transaccion(pago.referencia, "APPROVED", new Date(AHORA));
  await esperar(409, webhook(tx, { cambio: { amount_in_cents: 1 } }), "importe del evento");
  await esperar(409, webhook(tx, { cambio: { currency: "USD" } }), "moneda del evento");
  await esperar(422, webhook(tx, { environment: "prod" }), "ambiente");
  await esperar(401, webhook(tx, { firmaMala: true }), "firma");
  await esperar(404, webhook(tx, { cambio: { reference: "jjgym-no-existe" } }), "referencia desconocida");
  // El evento coincide, pero la API de Wompi dice otra cosa.
  transacciones.set(tx.id, { ...tx, amount_in_cents: MONTO_SEDE + 100 });
  await esperar(409, webhook(tx), "importe verificado");
  transacciones.set(tx.id, { ...tx, reference: "jjgym-otra" });
  await esperar(409, webhook(tx), "referencia verificada");
  transacciones.set(tx.id, { ...tx, currency: "USD" });
  await esperar(409, webhook(tx), "moneda verificada");
  transacciones.delete(tx.id);
  await esperar(409, webhook(tx), "transacción inexistente en Wompi");
  // Intento de otro ambiente.
  await prisma.pagoIntento.update({ where: { referencia: pago.referencia }, data: { ambiente: "prod" } });
  transacciones.set(tx.id, tx);
  await esperar(422, webhook(tx), "intento de otro ambiente");
  await prisma.pagoIntento.update({ where: { referencia: pago.referencia }, data: { ambiente: "test" } });

  const fila = await pagoDb(pago.referencia);
  assert.deepEqual([fila.estado, fila.wompiTransaccionId], ["PENDIENTE", null]);
  assert.equal(iso(await vigencia(SEDE_P)), antes);
  assert.equal(await prisma.suscripcionSedePeriodo.count({ where: { pagoId: fila.id } }), 0);
  // Con los datos correctos, el mismo intento sí se aplica una vez.
  await esperar(200, webhook(tx), "datos correctos");
  siguienteP();
  assert.equal(iso(await vigencia(SEDE_P)), iso(esperadoP));
});

test("webhook y conciliación simultáneos conceden un solo período", async () => {
  const { pago } = await checkout("adminP2", SEDE_P);
  const tx = transaccion(pago.referencia, "APPROVED", new Date(AHORA));
  const [porWebhook, porConciliacion] = await Promise.all([
    webhook(tx),
    api("POST", "/pagos/conciliar", "adminP2", { referencia: pago.referencia }),
  ]);
  assert.equal(porWebhook.status, 200, JSON.stringify(porWebhook.body));
  assert.equal(porConciliacion.status, 200, JSON.stringify(porConciliacion.body));
  const resultados = [porWebhook.body.resultado, porConciliacion.body.conciliacion].sort();
  assert.ok(resultados.includes("aplicado"), `uno de los dos aplica: ${resultados}`);
  const fila = await pagoDb(pago.referencia);
  assert.equal(await prisma.suscripcionSedePeriodo.count({ where: { pagoId: fila.id } }), 1);
  siguienteP();
  assert.equal(iso(await vigencia(SEDE_P)), iso(esperadoP));
});

test("dos pagos distintos simultáneos de la misma sede: ninguna renovación se pierde", async () => {
  const a = await checkout("adminP", SEDE_P);
  const b = await checkout("adminP2", SEDE_P);
  const inicio = esperadoP;
  const resultados = await Promise.all([
    webhook(transaccion(a.pago.referencia, "APPROVED", new Date(AHORA))),
    webhook(transaccion(b.pago.referencia, "APPROVED", new Date(AHORA))),
  ]);
  assert.deepEqual(resultados.map((r) => [r.status, r.body.resultado]), [[200, "aplicado"], [200, "aplicado"]]);
  siguienteP();
  const intermedio = esperadoP;
  siguienteP();
  const ultimos = (await periodos(SEDE_P)).slice(-2);
  assert.deepEqual(ultimos.map((p) => [p.tipo, iso(p.desde), iso(p.hasta)]),
    [["renovacion", iso(inicio), iso(intermedio)], ["renovacion", iso(intermedio), iso(esperadoP)]]);
  assert.equal(iso(await vigencia(SEDE_P)), iso(esperadoP));
});

test("dos aprobaciones para una referencia: evidencia para revisión y un solo período", async () => {
  // Segunda aprobación después de la primera.
  const uno = await checkout("adminP2", SEDE_P);
  const primera = transaccion(uno.pago.referencia, "APPROVED", new Date(AHORA));
  await esperar(200, webhook(primera), "primera");
  siguienteP();
  const segunda = transaccion(uno.pago.referencia, "APPROVED", new Date(AHORA));
  await esperar(409, webhook(segunda), "segunda");
  await esperar(409, webhook(segunda), "segunda repetida");
  const filaUno = await pagoDb(uno.pago.referencia);
  assert.equal(filaUno.wompiTransaccionId, primera.id);
  assert.equal(await prisma.suscripcionSedePeriodo.count({ where: { pagoId: filaUno.id } }), 1);
  const revision = await prisma.pagoTransaccionRevision.findMany({ where: { pagoId: filaUno.id } });
  assert.deepEqual(revision.map((r) => [r.wompiTransaccionId, r.transaccionAplicadaId, r.motivo, r.origen]),
    [[segunda.id, primera.id, "segunda_aprobacion", "Webhook de Wompi"]]);

  // Dos aprobaciones que llegan a la vez mientras el intento está pendiente.
  const dos = await checkout("adminP2", SEDE_P);
  const a = transaccion(dos.pago.referencia, "APPROVED", new Date(AHORA));
  const b = transaccion(dos.pago.referencia, "APPROVED", new Date(AHORA));
  const estados = (await Promise.all([webhook(a), webhook(b)])).map((r) => r.status).sort();
  assert.deepEqual(estados, [200, 409]);
  siguienteP();
  const filaDos = await pagoDb(dos.pago.referencia);
  assert.equal(await prisma.suscripcionSedePeriodo.count({ where: { pagoId: filaDos.id } }), 1);
  const revDos = await prisma.pagoTransaccionRevision.findMany({ where: { pagoId: filaDos.id } });
  assert.equal(revDos.length, 1);
  assert.equal(revDos[0].transaccionAplicadaId, filaDos.wompiTransaccionId);

  // La conciliación ve dos aprobadas en la lista de Wompi.
  const tres = await checkout("adminP2", SEDE_P);
  transaccion(tres.pago.referencia, "APPROVED", new Date(AHORA));
  transaccion(tres.pago.referencia, "APPROVED", new Date(AHORA));
  const conc = await esperar(200, api("POST", "/pagos/conciliar", "adminP2", { referencia: tres.pago.referencia }), "conciliar dos aprobadas");
  assert.equal(conc.conciliacion, "aplicado");
  siguienteP();
  const filaTres = await pagoDb(tres.pago.referencia);
  assert.equal(await prisma.suscripcionSedePeriodo.count({ where: { pagoId: filaTres.id } }), 1);
  const revTres = await prisma.pagoTransaccionRevision.findMany({ where: { pagoId: filaTres.id } });
  assert.deepEqual(revTres.map((r) => [r.origen, r.transaccionAplicadaId]), [["Conciliación de Wompi", filaTres.wompiTransaccionId]]);
  assert.equal(iso(await vigencia(SEDE_P)), iso(esperadoP));
});

test("reintento aprobado tras un rechazo concede vigencia una vez; una anulación posterior no la cambia", async () => {
  const { pago } = await checkout("adminB", SEDE_B);
  const antes = await vigencia(SEDE_B);
  await esperar(200, webhook(transaccion(pago.referencia, "DECLINED", new Date(AHORA))), "rechazo");
  const aprobada = transaccion(pago.referencia, "APPROVED", new Date(AHORA));
  assert.equal((await esperar(200, webhook(aprobada), "reintento")).resultado, "aplicado");
  const fila = await pagoDb(pago.referencia);
  assert.deepEqual([fila.estado, fila.wompiTransaccionId], ["APROBADO", aprobada.id]);
  const vence = sumarMesCalendario(antes!, 31);
  assert.equal(iso(await vigencia(SEDE_B)), iso(vence));
  // Anulación (VOIDED) después de aprobar: el intento queda ANULADO y la
  // vigencia no cambia (caso pendiente de política, ver documentación).
  const anulada = { ...aprobada, status: "VOIDED" };
  transacciones.set(aprobada.id, anulada);
  await esperar(200, webhook(anulada), "anulación");
  assert.equal((await pagoDb(pago.referencia)).estado, "ANULADO");
  assert.equal(iso(await vigencia(SEDE_B)), iso(vence));
  assert.equal(await prisma.suscripcionSedePeriodo.count({ where: { pagoId: fila.id } }), 1);
});

test("el flujo del usuario particular no cambia", async () => {
  const antes = await prisma.suscripcionSedePeriodo.count();
  const opciones = (await esperar(200, api("GET", "/pagos/opciones", "particular"), "opciones")).opciones;
  assert.deepEqual(opciones.map((o: Record<string, unknown>) => [o.plan, o.gym_slug, o.monto_en_centavos, "suscripcion" in o]),
    [["suscripcion_particular", null, MONTO_PARTICULAR, false]]);
  await esperar(400, api("POST", "/pagos/wompi/checkout", "particular", { gymSlug: SEDE_P, montoEnCentavos: MONTO_PARTICULAR }), "particular con sede");
  const { pago } = await checkout("particular", null, MONTO_PARTICULAR);
  assert.equal(pago.gym_slug, null);
  const tx = transaccion(pago.referencia, "APPROVED", new Date(AHORA), { amount_in_cents: MONTO_PARTICULAR });
  assert.equal((await esperar(200, webhook(tx), "webhook particular")).resultado, "aplicado");
  const estado = (await esperar(200, api("GET", `/pagos/estado?referencia=${pago.referencia}`, "particular"), "estado")).pago;
  assert.equal(estado.estado, "APROBADO");
  assert.equal("suscripcion" in estado, false);
  await esperar(404, api("GET", `/pagos/estado?referencia=${pago.referencia}`, "adminP"), "un admin no ve pagos particulares");
  assert.equal(await prisma.suscripcionSedePeriodo.count(), antes);
});

test("la base impide conceder dos veces el mismo pago o usar otra sede u otro plan", async () => {
  const [periodo] = await periodos(SEDE_P);
  const duplicado = prisma.$executeRawUnsafe(
    `INSERT INTO suscripciones_sede_periodos (id, gym_slug, pago_id, wompi_transaccion_id, tipo, aprobado_en, desde, hasta)
     VALUES ($1::uuid, $2, $3::uuid, 'tx-x', 'renovacion', now(), now() + interval '10 years', now() + interval '11 years')`,
    randomUUID(), SEDE_P, periodo.pagoId);
  await assert.rejects(duplicado, /suscripciones_sede_periodos_pago_id_key|unique/i);
  const otraSede = prisma.$executeRawUnsafe(
    `INSERT INTO suscripciones_sede_periodos (id, gym_slug, pago_id, wompi_transaccion_id, tipo, aprobado_en, desde, hasta)
     VALUES ($1::uuid, $2, $3::uuid, 'tx-y', 'renovacion', now(), now() + interval '20 years', now() + interval '21 years')`,
    randomUUID(), SEDE_L, randomUUID());
  await assert.rejects(otraSede, /foreign key|suscripciones_sede_periodos_pago_fkey/i);
  const particular = await prisma.pagoIntento.findFirstOrThrow({ where: { plan: "suscripcion_particular" } });
  const plan = prisma.$executeRawUnsafe(
    `INSERT INTO suscripciones_sede_periodos (id, gym_slug, pago_id, wompi_transaccion_id, tipo, aprobado_en, desde, hasta)
     VALUES ($1::uuid, $2, $3::uuid, 'tx-z', 'activacion', now(), now() + interval '30 years', now() + interval '31 years')`,
    randomUUID(), SEDE_P, particular.id);
  await assert.rejects(plan, /foreign key|suscripciones_sede_periodos_pago_fkey/i);
  // Ninguna consulta a Wompi usó otra llave ni otra ruta.
  assert.ok(llamadasWompi.length > 0 && llamadasWompi.every((l) => l.startsWith("GET /v1/transactions")));
});
