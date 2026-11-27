import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

globalThis.React = React;
const acceso = await import("./reportAccess.js");
const { accesoReportes } = acceso.default ?? acceso;
const acciones = await import("./ReportActions.jsx");
const { BotonesDescarga } = acciones.default ?? acciones;

test("limita los reportes y las sedes del Centro según el perfil", () => {
  const catalogo = [{ slug: "propia" }, { slug: "ajena" }];
  for (const tipo_usuario of ["cliente", "usuario_particular"]) {
    assert.deepEqual(accesoReportes({ tipo_usuario, sedes_administradas: ["ajena"] }, catalogo),
      { personales: true, resenas: false, consolidado: false, sedes: [] });
  }
  assert.deepEqual(accesoReportes({ tipo_usuario: "admin", sedes_administradas: ["propia"] }, catalogo),
    { personales: true, resenas: true, consolidado: false, sedes: ["propia"] });
  assert.deepEqual(accesoReportes({ tipo_usuario: "super_admin" }, catalogo),
    { personales: true, resenas: true, consolidado: true, sedes: ["propia", "ajena"] });
  assert.equal(accesoReportes(null, catalogo).personales, false);
});

test("expone acciones con nombre, foco visible y carga sin botones activos", () => {
  const render = props => renderToStaticMarkup(React.createElement(BotonesDescarga, props));
  const listo = render({});
  for (const formato of ["CSV", "PDF"]) assert.match(listo, new RegExp("Descargar " + formato));
  assert.match(listo, /focus-visible:outline/);
  assert.match(listo, /motion-safe:transition/);
  assert.match(listo, /enabled:cursor-pointer/);
  assert.doesNotMatch(listo, / disabled=""/);
  const cargando = render({ cargando: true });
  assert.equal((cargando.match(/ disabled=""/g) ?? []).length, 2);
  assert.match(cargando, /Preparando PDF/);
});
