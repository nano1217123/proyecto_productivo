import assert from "node:assert/strict";
import { mock, test } from "node:test";
import React from "react";

globalThis.React = React;
const sede = "jj-poblado";
const otraSede = "power-laureles";
let user;
let estado;
let refs;
let indiceEstado;
let indiceRef;
let efecto;

mock.module("react", {
  defaultExport: React,
  namedExports: {
    useCallback: callback => callback,
    useLayoutEffect: callback => { efecto = callback; },
    useRef: inicial => (refs[indiceRef++] ??= { current: inicial }),
    useState: inicial => {
      const indice = indiceEstado++;
      if (!(indice in estado)) estado[indice] = inicial;
      return [estado[indice], valor => { estado[indice] = valor; }];
    },
  },
});

mock.module(new URL("../../auth/context/AuthContext.jsx", import.meta.url).href, {
  namedExports: { useAuth: () => ({ user, loading: false }) },
});
mock.module(new URL("../../sedes/hooks/useSedes.js", import.meta.url).href, {
  namedExports: { useSedes: () => ({ sede: () => undefined }) },
});
const createReview = mock.fn(async () => {});
const getPublicReviews = mock.fn(async () => []);
mock.module(new URL("../api/reviewsApi.js", import.meta.url).href, {
  defaultExport: { createReview, getPublicReviews },
});

const { default: modulo } = await import("./ReviewsPage.jsx");
const ReviewsPage = modulo.default ?? modulo;

function renderizar() {
  indiceEstado = 0;
  indiceRef = 0;
  return ReviewsPage({ gym: otraSede });
}

async function montar() {
  estado = [];
  refs = [];
  user = { idusuario: "cliente-1", tipo_usuario: "cliente", sede };
  createReview.mock.resetCalls();
  getPublicReviews.mock.resetCalls();
  renderizar();
  const limpiar = efecto();
  await esperar();
  return limpiar;
}

function buscar(elemento, coincide) {
  if (Array.isArray(elemento)) {
    for (const hijo of elemento) {
      const encontrado = buscar(hijo, coincide);
      if (encontrado) return encontrado;
    }
  }
  if (React.isValidElement(elemento)) {
    if (coincide(elemento)) return elemento;
    return buscar(elemento.props.children, coincide);
  }
}

function enviar(nota) {
  const vista = renderizar();
  buscar(vista, elemento => elemento.props["aria-label"] === `${nota} de 5`).props.onClick();
  buscar(vista, elemento => elemento.type === "textarea").props.onChange({
    target: { value: "Mi experiencia" },
  });
  return buscar(renderizar(), elemento => elemento.type === "form").props.onSubmit({
    preventDefault() {},
  });
}

test("tras publicar cada nota, recarga la sede del cliente y muestra la misma confirmación", async () => {
  for (const nota of [1, 2, 3, 4, 5]) {
    const limpiar = await montar();
    getPublicReviews.mock.mockImplementationOnce(async () => [{
      id: "nueva", calificacion: nota, comentario: "Mi experiencia", creado_en: "2026-01-01",
    }]);
    await enviar(nota);
    assert.deepEqual(createReview.mock.calls[0].arguments, [{
      gymSlug: sede, calificacion: nota, comentario: "Mi experiencia",
    }]);
    assert.deepEqual(getPublicReviews.mock.calls.map(llamada => llamada.arguments), [[sede], [sede]]);
    const vista = renderizar();
    const resena = buscar(vista, elemento => elemento.type === "article");
    assert.ok(resena, `Debe aparecer la reseña de ${nota}`);
    assert.ok(buscar(vista, elemento => elemento.props.children === "Tu reseña se publicó correctamente."));
    limpiar();
  }
});

const esperar = () => new Promise(resolve => setImmediate(resolve));
const confirmacion = "Tu reseña se publicó correctamente.";
const texto = (vista, contenido) => buscar(vista, elemento => elemento.props.children === contenido);
const botonPublicar = vista => buscar(vista, elemento => elemento.props.type === "submit");

for (const cambio of ["usuario", "sede", "desmontaje"]) {
  test(`descarta respuestas de publicación obsoletas al cambiar ${cambio}`, async () => {
    for (const falla of [false, true]) {
      const limpiar = await montar();
      let terminar;
      createReview.mock.mockImplementationOnce(() => new Promise((resolve, reject) => {
        terminar = () => falla ? reject(new Error("Error de la publicación anterior")) : resolve();
      }));
      const pendiente = enviar(1);
      await enviar(1);
      assert.equal(createReview.mock.callCount(), 1);
      limpiar();

      let limpiarNueva;
      const siguienteSede = cambio === "sede" ? otraSede : sede;
      if (cambio !== "desmontaje") {
        user = {
          ...user, idusuario: cambio === "usuario" ? "cliente-2" : user.idusuario, sede: siguienteSede,
        };
        renderizar();
        limpiarNueva = efecto();
        await esperar();
        assert.equal(botonPublicar(renderizar()).props.disabled, true);
        await enviar(2);
        assert.equal(createReview.mock.callCount(), 1);
      }

      const estadoAntes = [...estado];
      terminar();
      await pendiente;
      if (cambio === "desmontaje") {
        assert.deepEqual(estado, estadoAntes);
        assert.deepEqual(getPublicReviews.mock.calls.map(llamada => llamada.arguments), [[sede]]);
      } else {
        const vista = renderizar();
        assert.equal(botonPublicar(vista).props.disabled, false);
        assert.equal(texto(vista, confirmacion), undefined);
        assert.equal(texto(vista, "Error de la publicación anterior"), undefined);
        assert.deepEqual(getPublicReviews.mock.calls.map(llamada => llamada.arguments), [[sede], [siguienteSede]]);
        await enviar(2);
        assert.equal(createReview.mock.callCount(), 2);
        limpiarNueva();
      }
    }
  });
}

test("un fallo de recarga conserva la confirmación y permite reintentar solo el listado", async () => {
  const limpiar = await montar();
  getPublicReviews.mock.mockImplementationOnce(async () => { throw new Error("Error de red"); });
  await enviar(3);
  const vista = renderizar();
  assert.ok(texto(vista, confirmacion));
  assert.ok(texto(vista, "No se pudieron cargar las reseñas. Puedes volver a actualizar el listado."));
  await texto(vista, "Actualizar").props.onClick();
  assert.ok(texto(renderizar(), confirmacion));
  assert.equal(createReview.mock.callCount(), 1);
  assert.equal(getPublicReviews.mock.callCount(), 3);
  limpiar();
});

test("un fallo de publicación muestra su error y conserva el borrador sin recargar", async () => {
  const limpiar = await montar();
  createReview.mock.mockImplementationOnce(async () => { throw new Error("No se pudo guardar"); });
  await enviar(4);
  const vista = renderizar();
  assert.ok(texto(vista, "No se pudo guardar"));
  assert.equal(texto(vista, confirmacion), undefined);
  assert.equal(buscar(vista, elemento => elemento.type === "textarea").props.value, "Mi experiencia");
  assert.equal(botonPublicar(vista).props.disabled, false);
  assert.equal(getPublicReviews.mock.callCount(), 1);
  limpiar();
});

test("una recarga posterior a publicar se descarta si la sede cambia antes de recibirla", async () => {
  const limpiar = await montar();
  let resolver;
  getPublicReviews.mock.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  const pendiente = enviar(5);
  await esperar();
  limpiar();
  user = { ...user, sede: otraSede };
  renderizar();
  const limpiarNueva = efecto();
  await esperar();
  resolver([{ id: "anterior", calificacion: 5, comentario: "Sede anterior", creado_en: "2026-01-01" }]);
  await pendiente;
  const vista = renderizar();
  assert.equal(texto(vista, "Sede anterior"), undefined);
  assert.equal(texto(vista, confirmacion), undefined);
  assert.ok(texto(vista, "Todavía no hay reseñas disponibles."));
  limpiarNueva();
});
