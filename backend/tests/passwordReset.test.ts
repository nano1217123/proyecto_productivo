import assert from "node:assert/strict";
import { mock, test } from "node:test";

const env = { resendApiKey: "", emailFrom: "QA <qa@example.invalid>",
  frontendUrl: "http://127.0.0.1:3000", isProduction: false };
const correo = "persona@example.invalid";
const enlace = env.frontendUrl + "/reset-password?token=fixture";
const guardar = mock.fn(async (_id: string, _hash: string, _expira: Date) => {});
const buscar = mock.fn(async (_correo: string): Promise<unknown> => null);

mock.module(new URL("../src/config/env.ts", import.meta.url).href, { namedExports: { env } });
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, { namedExports: { prisma: {} } });
mock.module(new URL("../src/repositories/usuariosAuth.repository.ts", import.meta.url).href, {
  namedExports: { usuariosAuthRepository: { findAuthByEmail: buscar } },
});
mock.module(new URL("../src/repositories/passwordReset.repository.ts", import.meta.url).href, {
  namedExports: { passwordResetRepository: { replaceForUser: guardar } },
});

const { sendPasswordResetEmail } = await import("../src/lib/email.js");
const { authService } = await import("../src/service/auth.service.js");

test("el envío desactivado no llama a Resend y solo registra el estado técnico", async t => {
  const fetchSimulado = t.mock.method(globalThis, "fetch", async () => assert.fail("llamada externa"));
  const info = t.mock.method(console, "info", () => {});
  assert.equal(await sendPasswordResetEmail(correo, "QA", enlace, 60), false);
  assert.equal(fetchSimulado.mock.callCount(), 0);
  assert.deepEqual(info.mock.calls.map(c => c.arguments), [["[auth.password_reset.email] envio_desactivado"]]);
});

test("se conservan el envío configurado y los resultados saneados del proveedor", async t => {
  t.after(() => { env.resendApiKey = ""; env.isProduction = false; });
  env.resendApiKey = "clave-ficticia";
  env.isProduction = true;
  const info = t.mock.method(console, "info", () => {});
  const error = t.mock.method(console, "error", () => {});
  const fetchSimulado = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 202 }));
  assert.equal(await sendPasswordResetEmail(correo, "QA", enlace, 60), true);
  const [destino, opciones] = fetchSimulado.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(destino, "https://api.resend.com/emails");
  assert.equal(opciones.method, "POST");
  const payload = JSON.parse(String(opciones.body));
  assert.equal(payload.to, correo);
  assert.equal(payload.from, env.emailFrom);
  assert.ok(payload.html.includes(enlace));
  fetchSimulado.mock.mockImplementationOnce(async () => new Response(correo + enlace, { status: 422 }));
  assert.equal(await sendPasswordResetEmail(correo, "QA", enlace, 60), false);
  fetchSimulado.mock.mockImplementationOnce(async () => { throw new Error(correo + enlace); });
  assert.equal(await sendPasswordResetEmail(correo, "QA", enlace, 60), false);
  assert.deepEqual(info.mock.calls.map(c => c.arguments), [["[auth.password_reset.email] aceptado_por_proveedor"]]);
  assert.deepEqual(error.mock.calls.map(c => c.arguments), [
    ["[auth.password_reset.email] rechazo_del_proveedor", 422],
    ["[auth.password_reset.email] error_de_transporte"],
  ]);
});

test("la respuesta genérica coincide para cuenta ausente, sin verificar y con envío fallido o desactivado", async t => {
  t.after(() => { env.resendApiKey = ""; });
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const cuenta = { idusuario: "qa", nombres: "QA", emailVerified: true };
  const esperado = await authService.forgotPassword({ email: correo });
  buscar.mock.mockImplementationOnce(async () => ({ ...cuenta, emailVerified: false }));
  assert.deepEqual(await authService.forgotPassword({ email: correo }), esperado);
  assert.equal(guardar.mock.callCount(), 0);
  buscar.mock.mockImplementationOnce(async () => cuenta);
  assert.deepEqual(await authService.forgotPassword({ email: correo }), esperado);
  env.resendApiKey = "clave-ficticia";
  buscar.mock.mockImplementationOnce(async () => cuenta);
  assert.deepEqual(await authService.forgotPassword({ email: correo }), esperado);
  assert.equal(guardar.mock.callCount(), 2);
  for (const { arguments: [id, hash, expira] } of guardar.mock.calls) {
    assert.equal(id, "qa");
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.ok(Math.abs(expira.getTime() - Date.now() - 3_600_000) < 5_000);
  }
});

test("un fallo inesperado al preparar la recuperación registra solo un código técnico", async t => {
  const error = t.mock.method(console, "error", () => {});
  buscar.mock.mockImplementationOnce(async () => { throw new Error(correo + enlace); });
  await assert.rejects(authService.forgotPassword({ email: correo }), { statusCode: 500 });
  assert.deepEqual(error.mock.calls.map(c => c.arguments), [["[auth.password_reset] error_al_preparar_solicitud"]]);
});
