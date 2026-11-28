import assert from "node:assert/strict";
import { test } from "node:test";
import { dashboardReturnTo, loginUrl } from "./returnTo.js";

test("conserva la ruta del dashboard, la sede y los filtros de Historial", () => {
  const path = "/dashboard/entrenamientos/historial";
  const search = "?gym=jj-poblado&buscar=tren%20superior&orden=volumen";
  const url = new URL(loginUrl(path, search), "https://qa.example");
  assert.equal(url.pathname, "/login");
  assert.equal(url.searchParams.get("gym"), "jj-poblado");
  assert.equal(dashboardReturnTo(url.searchParams.get("returnTo")), path + search);
});

test("rechaza destinos externos, ambiguos y rutas de autenticaci?n", () => {
  for (const value of [null, "//example.com", "https://example.com", "/login", "/api/auth/refresh",
    "/dashboard/../login", "/dashboard/%2e%2e/login", "/dashboard\\login", "/dashboard//rutinas",
    "/dashboard/%2frutinas", "/dashboard#login", "/dashboard\n"]) {
    assert.equal(dashboardReturnTo(value), null, String(value));
  }
  assert.equal(loginUrl("/login", ""), "/login");
});
