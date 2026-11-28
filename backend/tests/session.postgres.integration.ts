import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { after, test } from "node:test";
import { neonConfig } from "@neondatabase/serverless";

const database = new URL(process.env.JJGYM_SESSION_TEST_DATABASE ?? "");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/jjgym_session_test");
assert.ok(database.port);
Object.assign(process.env, {
  DATABASE_URL: database.href, DIRECT_URL: database.href, JWT_SECRET: randomUUID(),
  GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", GOOGLE_REDIRECT_URI: "http://127.0.0.1/test",
  CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test",
});

// Conecta el adaptador Neon directamente al Postgres local de pruebas.
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

const { prisma } = await import("../src/lib/prisma.js");
const { hashPassword, comparePassword } = await import("../src/lib/hash.js");
const { hashResetToken } = await import("../src/lib/resetToken.js");
const { authService } = await import("../src/service/auth.service.js");
const { passwordResetRepository } = await import("../src/repositories/passwordReset.repository.js");

after(() => prisma.$disconnect());

test("dos cambios concurrentes consumen el token una sola vez y revocan los refresh rotados", async () => {
  const idusuario = randomUUID();
  const correo = `${idusuario}@example.test`;
  const original = "Antes1234!";
  await prisma.usuario.create({ data: {
    idusuario, correo, nombres: "QA", apellidos: "Sesión",
    passwordHash: await hashPassword(original), emailVerified: true,
  } });
  const { refreshToken } = await authService.login({ email: correo, password: original });
  const token = randomUUID();
  await passwordResetRepository.replaceForUser(idusuario, hashResetToken(token), new Date(Date.now() + 60_000));

  const passwords = ["CambioPrimero123!", "CambioSegundo123!"];
  const [first, second] = await Promise.allSettled([
    authService.resetPassword({ token, password: passwords[0] }),
    authService.resetPassword({ token, password: passwords[1] }),
    authService.refresh(refreshToken),
  ]);
  const results = [first, second];
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const denied = results.find((result) => result.status === "rejected");
  assert.equal(denied?.reason.statusCode, 400);

  const user = await prisma.usuario.findUniqueOrThrow({ where: { idusuario } });
  const winningPassword = passwords[results.findIndex((result) => result.status === "fulfilled")];
  assert.ok(await comparePassword(winningPassword, user.passwordHash!));
  assert.equal(await prisma.refreshToken.count({ where: { usuarioId: idusuario, revoked: false } }), 0);
  assert.equal(await prisma.passwordResetToken.count({ where: { usuarioId: idusuario, used: true } }), 1);
});
