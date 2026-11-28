import assert from "node:assert/strict";
import { mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

globalThis.React = React;
const acceso = await import("./reportAccess.js");
const { accesoReportes } = acceso.default ?? acceso;
const acciones = await import("./ReportActions.jsx");
const { BotonesDescarga, EstadoDescarga, FechasReporte } = acciones.default ?? acciones;

let perfil;
let cargandoSesion = false;
mock.module(new URL("../auth/context/AuthContext.jsx", import.meta.url).href, {
  namedExports: { useAuth: () => ({ profile: perfil, loading: cargandoSesion }) },
});
mock.module(new URL("../sedes/hooks/useSedes.js", import.meta.url).href, {
  namedExports: { useSedes: () => ({
    sedes: [{ slug: "propia" }, { slug: "otra" }, { slug: "ajena" }],
    nombreSede: slug => slug,
  }) },
});
const centro = await import("./CentroReportes.jsx");
const CentroReportes = centro.default.default ?? centro.default;

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

test("conserva el acceso personal y el enlace a Progreso para clientes y particulares", () => {
  for (const tipo_usuario of ["cliente", "usuario_particular"]) {
    perfil = { tipo_usuario };
    const vista = renderToStaticMarkup(React.createElement(CentroReportes, { gym: "ajena" }));
    assert.match(vista, /Tipo de reporte personal/);
    assert.match(vista, /Ejercicios realizados/);
    assert.match(vista, /href="\/dashboard\/entrenamientos\/progreso#vista-previa-progreso"/);
    assert.match(vista, /Categoría de reporte/);
    assert.doesNotMatch(vista, /aria-label="Reseñas"|aria-label="Membresías"|Sede del reporte/);
    assert.equal((vista.match(/type="radio"/g) ?? []).length, 3);
    assert.match(vista, /type="radio"[^>]*checked=""[^>]*value="progreso"/);
  }
});

test("el acceso desde Reseñas abre el reporte con una sede permitida y respeta el rol", () => {
  perfil = { tipo_usuario: "admin", sedes_administradas: ["propia", "otra"] };
  const render = gym => renderToStaticMarkup(React.createElement(CentroReportes, { gym }));
  assert.match(render(), /aria-label="Mis reportes" aria-pressed="true"/);
  const desdeResenas = render("otra");
  assert.match(desdeResenas, /aria-label="Reseñas" aria-pressed="true"/);
  assert.match(desdeResenas, /value="otra" selected/);
  assert.doesNotMatch(desdeResenas, /value="ajena"|Consolidado/);
  assert.match(render("ajena"), /value="propia" selected/);
  perfil = { tipo_usuario: "super_admin" };
  assert.match(render("ajena"), /value="ajena" selected/);
  assert.match(render("ajena"), /Consolidado/);
});

test("distingue comprobación de sesión, ausencia de permiso y estados de descarga", () => {
  perfil = null;
  cargandoSesion = true;
  assert.match(renderToStaticMarkup(React.createElement(CentroReportes)), /role="status">Cargando permisos/);
  cargandoSesion = false;
  const anonimo = renderToStaticMarkup(React.createElement(CentroReportes));
  assert.match(anonimo, /Necesitas una sesión habilitada/);
  assert.doesNotMatch(anonimo, /Descargar CSV/);
  const estado = resultado => renderToStaticMarkup(React.createElement(EstadoDescarga, { resultado }));
  assert.match(estado({ estado: "cargando" }), /role="status"[^>]*>Preparando el archivo/);
  assert.match(estado({ estado: "error", mensaje: "Error de red" }), /role="alert"[^>]*>Error de red/);
  assert.match(estado({ estado: "exito", mensaje: "Descarga iniciada" }), /role="status"[^>]*>Descarga iniciada/);
});

test("las fechas son opcionales, tienen etiquetas y acotan el rango en ambos sentidos", () => {
  const vista = renderToStaticMarkup(React.createElement(FechasReporte, {
    desde: "2026-01-01", hasta: "2026-01-31", setDesde() {}, setHasta() {},
  }));
  assert.match(vista, /<input(?=[^>]*name="desde")(?=[^>]*max="2026-01-31")/);
  assert.match(vista, /<input(?=[^>]*name="hasta")(?=[^>]*min="2026-01-01")/);
  assert.match(vista, /Fechas opcionales/);
  assert.doesNotMatch(vista, / required/);
});
