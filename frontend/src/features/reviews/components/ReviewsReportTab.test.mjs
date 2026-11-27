import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// El cargador TSX local usa la transformación clásica de JSX en este ensayo.
globalThis.React = React;
const { default: moduloTabs } = await import("../../admin/components/AdminTabs.jsx");
const { default: moduloReporte } = await import("./ReviewsReportTab.jsx");
const AdminTabs = moduloTabs.default ?? moduloTabs;
const ReviewsReportTab = moduloReporte.default ?? moduloReporte;

test("renderiza Reportes y conserva las acciones administrativas de cada rol", () => {
  const admin = renderToStaticMarkup(React.createElement(AdminTabs, { esAdmin: true, tabActiva: "clientes" }));
  const superAdmin = renderToStaticMarkup(React.createElement(AdminTabs, {
    esSuperAdmin: true, tabActiva: "reportes-resenas",
  }));
  const comun = renderToStaticMarkup(React.createElement(AdminTabs, {}));
  assert.match(admin, /Reportes de reseñas/);
  assert.match(admin, /Suscripción/);
  assert.doesNotMatch(admin, /Asignar administrador/);
  assert.match(superAdmin, /aria-current="page"[^>]*>Reportes de reseñas/);
  assert.match(superAdmin, /Asignar administrador/);
  assert.doesNotMatch(superAdmin, /Suscripción/);
  assert.doesNotMatch(comun, /Reportes de reseñas/);
});

test("muestra la sede recibida y deja inactiva la descarga cuando falta", () => {
  const sinSede = renderToStaticMarkup(React.createElement(ReviewsReportTab));
  assert.match(sinSede, /No hay una sede disponible/);
  assert.match(sinSede, /<button[^>]*disabled=""[^>]*>Descargar CSV/);
  for (const sede of [{ id: "jj-poblado", nombre: "El Poblado" }, { id: "power-laureles", nombre: "Laureles" }]) {
    const vista = renderToStaticMarkup(React.createElement(ReviewsReportTab, { sede }));
    assert.ok(vista.includes("Sede seleccionada: " + sede.nombre));
    assert.match(vista, /<label for="[^"]+-desde"[^>]*>Fecha inicial/);
    assert.match(vista, /<label for="[^"]+-hasta"[^>]*>Fecha final/);
    assert.doesNotMatch(vista, /<button[^>]*disabled=""[^>]*>Descargar CSV/);
  }
});
