import assert from "node:assert/strict";
import { test } from "node:test";
import { SESSION_ENDED, sessionFetch } from "./sessionFetch.js";

function browser(t, fetch) {
  const previous = globalThis.window;
  const window = new EventTarget();
  globalThis.window = window;
  t.after(() => {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  });
  t.mock.method(globalThis, "fetch", fetch);
  return window;
}

const response = (status) => new Response(null, { status });

test("renueva una vez para varias peticiones y conserva método y cuerpo", async (t) => {
  let renewed = false;
  let refreshes = 0;
  const options = { method: "POST", body: '{"id":1}', credentials: "include" };
  const attempts = [];
  browser(t, async (url, init) => {
    if (url === "/api/auth/refresh") {
      refreshes++;
      renewed = true;
      return response(200);
    }
    if (url === "/api/perfil") return response(401);
    attempts.push([url, init]);
    return response(renewed ? 200 : 401);
  });

  const results = await Promise.all([
    sessionFetch("/api/rutinas", options),
    sessionFetch("/api/entrenamientos", options),
  ]);
  assert.deepEqual(results.map((result) => result.status), [200, 200]);
  assert.equal(refreshes, 1);
  assert.equal(attempts.length, 4);
  assert.ok(attempts.every(([, init]) => init === options));
});

test("reintenta con las cookies ya renovadas por otra pestaña", async (t) => {
  let attempts = 0;
  browser(t, async (url) => {
    if (url === "/api/perfil") return response(200);
    assert.equal(url, "/api/rutinas");
    return response(++attempts === 1 ? 401 : 200);
  });

  assert.equal((await sessionFetch("/api/rutinas")).status, 200);
  assert.equal(attempts, 2);
});

test("solo un 401 de renovación finaliza la sesión", async (t) => {
  let status = 503;
  let ended = 0;
  const window = browser(t, async (url) =>
    response(url === "/api/auth/refresh" ? status : 401));
  window.addEventListener(SESSION_ENDED, () => ended++);

  for (status of [503, 429, 409, 401]) {
    assert.equal((await sessionFetch("/api/rutinas")).status, status);
    assert.equal(ended, status === 401 ? 1 : 0);
  }
});

test("conserva errores de red y no renueva para un 403, login o URL externa", async (t) => {
  const attempts = [];
  const error = new TypeError("offline");
  browser(t, async (url) => {
    attempts.push(url);
    if (url === "/api/ejercicios") throw error;
    return response(url === "/api/gestion" ? 403 : 401);
  });

  assert.equal((await sessionFetch("/api/gestion")).status, 403);
  assert.equal((await sessionFetch("/api/auth/login")).status, 401);
  assert.equal((await sessionFetch("https://example.invalid/api/rutinas")).status, 401);
  await assert.rejects(sessionFetch("/api/ejercicios"), error);
  assert.deepEqual(attempts, ["/api/gestion", "/api/auth/login", "https://example.invalid/api/rutinas", "/api/ejercicios"]);
});
