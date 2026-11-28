import assert from "node:assert/strict";
import { once } from "node:events";
import { after, mock, test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";

const password = "FixturePassword123!";
const passwordHash = await bcrypt.hash(password, 4);
const roles = ["usuario_particular", "cliente", "admin", "super_admin"] as const;
const users = roles.map((tipoUsuario) => ({
  idusuario: tipoUsuario, correo: `${tipoUsuario}@example.com`,
  tipoUsuario, nombres: "QA", apellidos: "Sesión", passwordHash,
  emailVerified: true, bloqueadoHasta: null, adminSedes: [],
}));

interface Token {
  id: string;
  usuarioId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
}
const tokens = new Map<string, Token>();
const refreshToken = {
  async findUnique({ where }: { where: { tokenHash: string } }) {
    const token = tokens.get(where.tokenHash);
    return token ? { ...token } : null;
  },
  async create({ data }: { data: Omit<Token, "id" | "revoked"> }) {
    tokens.set(data.tokenHash, { ...data, id: data.tokenHash, revoked: false });
  },
  async update({ where }: { where: { id: string } }) {
    tokens.get(where.id)!.revoked = true;
  },
  async updateMany({ where }: { where: { id?: string; usuarioId: string; expiresAt?: { gt: Date } } }) {
    const rows = [...tokens.values()].filter((token) => !token.revoked &&
      token.usuarioId === where.usuarioId && (!where.id || where.id === token.id) &&
      (!where.expiresAt || token.expiresAt > where.expiresAt.gt));
    for (const row of rows) row.revoked = true;
    return { count: rows.length };
  },
};
mock.module(new URL("../src/config/env.ts", import.meta.url).href, {
  exports: { env: { isProduction: true, jwtSecret: "fixture-secret", jwtExpiresIn: "15m",
    refreshTokenExpiresIn: "7d", recaptchaSecretKey: "" } },
});
mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, {
  exports: { prisma: {
    usuario: {
      async findUnique({ where }: { where: { correo?: string; idusuario?: string } }) {
        return users.find((user) => user.correo === where.correo || user.idusuario === where.idusuario) ?? null;
      },
      async update() {},
    },
    refreshToken,
    $transaction: (operation: (tx: { refreshToken: typeof refreshToken }) => unknown) => operation({ refreshToken }),
  } },
});

const { login, refresh, logout } = await import("../src/controller/auth.controller.js");
const { getPerfil } = await import("../src/controller/perfil.controller.js");
const { requireAuth } = await import("../src/middleware/auth.middleware.js");
const { requireRole } = await import("../src/middleware/requireRole.middleware.js");
const { errorHandler } = await import("../src/middleware/error.middleware.js");
const { createRefreshTokensRepository } = await import("../src/repositories/refreshTokens.repository.js");

const app = express();
app.use(express.json(), cookieParser());
app.post("/auth/login", login);
app.post("/auth/refresh", refresh);
app.post("/auth/logout", logout);
app.get("/perfil", requireAuth, getPerfil);
app.get("/admin", requireAuth, requireRole("admin", "super_admin"), (_req, res) => res.sendStatus(204));
app.get("/super", requireAuth, requireRole("super_admin"), (_req, res) => res.sendStatus(204));
app.use(errorHandler);
const server = app.listen(0, "127.0.0.1");
after(() => server.close());
await once(server, "listening");
const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const request = (path: string, options?: RequestInit) => fetch(endpoint + path, options);
const cookie = (response: Response, name: string) => {
  const value = response.headers.getSetCookie().find((c) => c.startsWith(name + "="));
  assert.ok(value);
  return value.split(";")[0];
};
const post = (path: string, cookie: string) => request(path, { method: "POST", headers: { cookie } });

for (const role of roles) {
  test(`login, perfil, permisos, renovación y logout para ${role}`, async () => {
    const result = await request("/auth/login", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: `${role}@example.com`, password }) });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).user.tipoUsuario, role);
    const issued = result.headers.getSetCookie();
    assert.ok(issued.every((c) => c.includes("HttpOnly") && c.includes("Secure") && c.includes("SameSite=Lax")));
    assert.match(issued[0], /; Path=\/;/);
    assert.match(issued[1], /; Path=\/api\/auth;/);
    const access = { cookie: cookie(result, "access_token") };
    const profile = await request("/perfil", { headers: access });
    assert.equal((await profile.json()).profile.tipo_usuario, role);
    assert.match(profile.headers.get("cache-control")!, /no-store/);
    assert.equal((await request("/admin", { headers: access })).status, ["admin", "super_admin"].includes(role) ? 204 : 403);
    assert.equal((await request("/super", { headers: access })).status, role === "super_admin" ? 204 : 403);
    assert.equal((await request("/perfil")).status, 401);

    const renewed = await post("/auth/refresh", cookie(result, "refresh_token"));
    assert.equal(renewed.status, 200);
    assert.notEqual(cookie(renewed, "refresh_token"), cookie(result, "refresh_token"));
    const loggedOut = await post("/auth/logout", cookie(renewed, "refresh_token"));
    assert.equal(loggedOut.status, 200);
    assert.ok(loggedOut.headers.getSetCookie().every((c) => c.includes("Expires=Thu, 01 Jan 1970")));
    assert.equal((await post("/auth/refresh", cookie(renewed, "refresh_token"))).status, 401);
  });
}

test("un refresh vencido no renueva y un token solo admite una rotación concurrente", async () => {
  const repository = createRefreshTokensRepository();
  const expired = new Date(Date.now() - 1000);
  const future = new Date(Date.now() + 60_000);
  await repository.create("fixture", "expired", expired);
  assert.equal(await repository.rotate("expired", "fixture", "unused", future), false);
  await repository.create("fixture", "valid", future);
  const results = await Promise.all([
    repository.rotate("valid", "fixture", "first", future),
    repository.rotate("valid", "fixture", "second", future),
  ]);
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal([...tokens.values()].filter((token) => ["first", "second"].includes(token.id)).length, 1);
});
