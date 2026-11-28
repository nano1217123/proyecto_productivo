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
let efectoPasivo;
let gymPagina;
let ruta = "/dashboard/resenas";
let parametros = new URLSearchParams();
const replace = mock.fn();

mock.module("next/navigation", {
  namedExports: {
    useRouter: () => ({ replace }),
    usePathname: () => ruta,
    useSearchParams: () => parametros,
  },
});

mock.module("react", {
  defaultExport: React,
  namedExports: {
    useCallback: callback => callback,
    useEffect: callback => { efectoPasivo = callback; },
    useLayoutEffect: callback => { efecto = callback; },
    useRef: inicial => (refs[indiceRef++] ??= { current: inicial }),
    useState: inicial => {
      const indice = indiceEstado++;
      if (!(indice in estado)) estado[indice] = inicial;
      return [estado[indice], valor => {
        estado[indice] = typeof valor === "function" ? valor(estado[indice]) : valor;
      }];
    },
  },
});

mock.module(new URL("../../auth/context/AuthContext.jsx", import.meta.url).href, {
  namedExports: { useAuth: () => ({ user, profile: user, loading: false }) },
});
mock.module(new URL("../../sedes/hooks/useSedes.js", import.meta.url).href, {
  namedExports: { useSedes: () => ({
    sedes: [{ slug: sede }, { slug: otraSede }], sede: () => undefined,
  }) },
});
const createReview = mock.fn(async () => {});
const getPublicReviews = mock.fn(async () => []);
const getPublicReviewPage = mock.fn(async gym => ({ resenas: await getPublicReviews(gym) }));
const getAdminReviewPage = mock.fn(async () => ({ resenas: [] }));
const manageOfficialReply = mock.fn(async () => {});
const setHelpfulVote = mock.fn();
const reportReview = mock.fn(async () => ({ id: "caso" }));
const getModerationPage = mock.fn(async () => ({ casos: [] }));
const getAllReviews = mock.fn(async () => []);
const getOwnReviews = mock.fn(async () => []);
const updateOwnReview = mock.fn();
const deleteOwnReview = mock.fn();
mock.module(new URL("../api/reviewsApi.js", import.meta.url).href, {
  defaultExport: { createReview, getPublicReviewPage, getAdminReviewPage, manageOfficialReply, setHelpfulVote,
    getAllReviews, getOwnReviews, updateOwnReview, deleteOwnReview, reportReview, getModerationPage },
});

const { default: modulo } = await import("./ReviewsPage.jsx");
const ReviewsPage = modulo.default ?? modulo;
const { default: moduloNav } = await import("../../dashboard/views/DashboardNavigation.jsx");
const DashboardNavigation = moduloNav.default ?? moduloNav;
const { default: moduloPropias } = await import("../components/MisResenas.jsx");
const MisResenas = moduloPropias.default ?? moduloPropias;
const { default: moduloResumen } = await import("../components/ResumenResenas.jsx");
const ResumenResenas = moduloResumen.default ?? moduloResumen;
const { default: moduloRespuesta } = await import("../components/RespuestaOficial.jsx");
const RespuestaOficial = moduloRespuesta.default ?? moduloRespuesta;
const { default: moduloVoto } = await import("../components/VotoUtil.jsx");
const VotoUtil = moduloVoto.default ?? moduloVoto;
const { default: moduloDenuncia } = await import("../components/DenunciarResena.jsx");
const DenunciarResena = moduloDenuncia.default ?? moduloDenuncia;
const { default: moduloCola } = await import("../components/ColaModeracion.jsx");
const ColaModeracion = moduloCola.default ?? moduloCola;

function renderizar() {
  indiceEstado = 0;
  indiceRef = 0;
  return ReviewsPage({ gym: gymPagina });
}

async function montar(perfil = { tipo_usuario: "cliente", sede }, gym = otraSede) {
  estado = [];
  refs = [];
  user = { idusuario: "cliente-1", ...perfil };
  gymPagina = gym;
  createReview.mock.resetCalls();
  getPublicReviews.mock.resetCalls();
  getPublicReviewPage.mock.resetCalls();
  getAdminReviewPage.mock.resetCalls();
  manageOfficialReply.mock.resetCalls();
  setHelpfulVote.mock.resetCalls();
  getAllReviews.mock.resetCalls();
  replace.mock.resetCalls();
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
const botonPublicar = vista => buscar(vista, elemento =>
  elemento.props.type === "submit" && ["Publicar reseña", "Publicando..."].includes(elemento.props.children));

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

test("la navegación de escritorio y móvil ofrece Reseñas con el contexto de cada rol", () => {
  parametros = new URLSearchParams({ gym: otraSede });
  const casos = [
    [{ tipo_usuario: "cliente", sede }, "?gym=jj-poblado"],
    [{ tipo_usuario: "cliente" }, ""],
    [{ tipo_usuario: "usuario_particular" }, "?gym=power-laureles&modo=casa"],
    [{ tipo_usuario: "admin", sedes_administradas: [sede] }, ""],
    [{ tipo_usuario: "admin", sedes_administradas: [otraSede] }, "?gym=power-laureles"],
    [{ tipo_usuario: "super_admin" }, ""],
  ];
  for (const [perfil, query] of casos) {
    user = perfil;
    ruta = "/dashboard/resenas";
    const vista = DashboardNavigation();
    const escritorio = buscar(vista, elemento => elemento.type === "nav");
    const detalles = buscar(vista, elemento => elemento.type === "details");
    for (const menu of [escritorio, detalles]) {
      const enlace = texto(menu, "Reseñas");
      assert.equal(enlace.props.href, "/dashboard/resenas" + query);
      assert.equal(enlace.props["aria-current"], "page");
    }
    const menuMovil = { open: true };
    texto(detalles, "Reseñas").props.onClick({ currentTarget: {
      closest: selector => selector === "details" ? menuMovil : null,
    } });
    assert.equal(menuMovil.open, false);
    assert.equal(texto(escritorio, "Reportes").props.href.startsWith("/dashboard/reportes"), true);
    ruta = "/dashboard/reportes";
    assert.equal(texto(DashboardNavigation(), "Reseñas").props["aria-current"], undefined);
  }
});

test("un cliente sin sede ve el aviso aunque la URL indique una sede válida", async () => {
  const limpiar = await montar({ tipo_usuario: "cliente" });
  const vista = renderizar();
  assert.ok(buscar(vista, elemento => elemento.props.role === "status"));
  assert.equal(botonPublicar(vista), undefined);
  assert.equal(getPublicReviews.mock.callCount(), 0);
  limpiar();
});

test("el particular selecciona una sede del catálogo y solo publica en una selección válida", async () => {
  const perfil = { tipo_usuario: "usuario_particular" };
  const limpiar = await montar(perfil, "sede-inexistente");
  const vista = renderizar();
  const selector = buscar(vista, elemento => elemento.type === "select");
  assert.equal(selector.props.value, "");
  assert.equal(botonPublicar(vista), undefined);
  assert.equal(getPublicReviews.mock.callCount(), 0);
  selector.props.onChange({ target: { value: otraSede } });
  assert.deepEqual(replace.mock.calls[0].arguments, ["/dashboard/resenas?gym=power-laureles&modo=casa"]);
  limpiar();

  const limpiarSeleccion = await montar(perfil, otraSede);
  await enviar(1);
  assert.equal(createReview.mock.calls[0].arguments[0].gymSlug, otraSede);
  assert.deepEqual(getPublicReviews.mock.calls.map(llamada => llamada.arguments), [[otraSede], [otraSede]]);
  assert.equal(texto(renderizar(), "Reportes de reseñas"), undefined);
  limpiarSeleccion();
});

test("el administrador solo obtiene opciones asignadas y conserva acceso a sus reportes", async () => {
  for (const gym of [otraSede, sede, ""]) {
    const limpiar = await montar({ tipo_usuario: "admin", sedes_administradas: [sede] }, gym);
    const vista = renderizar();
    const selector = buscar(vista, elemento => elemento.type === "select");
    assert.deepEqual(selector.props.children[1].map(opcion => opcion.props.value), [sede]);
    assert.equal(botonPublicar(vista), undefined);
    assert.equal(getAllReviews.mock.callCount(), 0);
    assert.deepEqual(getAdminReviewPage.mock.calls.map(llamada => llamada.arguments[0]), gym === sede ? [sede] : []);
    assert.equal(getPublicReviews.mock.callCount(), 0);
    assert.equal(texto(vista, "Reportes de reseñas").props.href,
      gym === sede ? "/dashboard/reportes?gym=jj-poblado" : "/dashboard/reportes");
    limpiar();
  }
  const limpiar = await montar({ tipo_usuario: "admin", sedes_administradas: [] }, sede);
  assert.ok(buscar(renderizar(), elemento => elemento.props.role === "status"));
  assert.equal(getPublicReviews.mock.callCount(), 0);
  limpiar();
});

test("el superadministrador conserva la consulta global y el acceso a reportes", async () => {
  const limpiar = await montar({ tipo_usuario: "super_admin" }, otraSede);
  const vista = renderizar();
  assert.equal(getAllReviews.mock.callCount(), 1);
  assert.equal(getPublicReviews.mock.callCount(), 0);
  assert.equal(botonPublicar(vista), undefined);
  assert.equal(texto(vista, "Reportes de reseñas").props.href, "/dashboard/reportes");
  limpiar();
});

const propia = {
  id: "propia-1", gym_slug: sede, calificacion: 1, comentario: "Comentario original", creado_en: "2026-01-01",
};
const actualizarPublicas = mock.fn();
let gestionOcupada;

function renderizarPropias() {
  indiceEstado = 0;
  indiceRef = 0;
  return MisResenas({
    nombreSede: () => "El Poblado", version: 0, alCambiar: actualizarPublicas,
    ocupado: gestionOcupada,
    iniciarGestion: () => {
      if (gestionOcupada) return false;
      gestionOcupada = true;
      return true;
    },
    finalizarGestion: () => { gestionOcupada = false; },
  });
}

function montarPropias(cargaInicial) {
  estado = [];
  refs = [];
  for (const funcion of [getOwnReviews, updateOwnReview, deleteOwnReview, actualizarPublicas]) funcion.mock.resetCalls();
  if (cargaInicial) getOwnReviews.mock.mockImplementationOnce(cargaInicial);
  renderizarPropias();
  const limpiar = efecto();
  efectoPasivo();
  return limpiar;
}

test("Mis reseñas muestra carga, error de red, reintento y vacío", async () => {
  const limpiar = montarPropias(async () => { throw new Error("Sin red"); });
  assert.ok(texto(renderizarPropias(), "Cargando tus reseñas…"));
  await esperar();
  assert.ok(texto(renderizarPropias(), "No se pudieron cargar tus reseñas."));
  await texto(renderizarPropias(), "Actualizar mis reseñas").props.onClick();
  assert.ok(texto(renderizarPropias(), "Todavía no has publicado reseñas."));
  limpiar();
});

test("editar conserva el borrador en un fallo y refresca ambos listados al guardar", async () => {
  const limpiar = montarPropias(async () => [propia]);
  await esperar();
  let vista = renderizarPropias();
  assert.ok(texto(vista, "El Poblado"));
  assert.equal(buscar(vista, elemento => elemento.type === "time").props.dateTime, propia.creado_en);
  texto(vista, "Editar").props.onClick();
  vista = renderizarPropias();
  buscar(vista, elemento => elemento.type === "select").props.onChange({ target: { value: "3" } });
  buscar(renderizarPropias(), elemento => elemento.type === "textarea").props.onChange({ target: { value: "Borrador" } });
  const guardar = () => buscar(renderizarPropias(), elemento => elemento.type === "form").props.onSubmit({
    preventDefault() {},
  });
  updateOwnReview.mock.mockImplementationOnce(async () => { throw new Error("Sin conexión"); });
  guardar();
  await esperar();
  vista = renderizarPropias();
  assert.ok(texto(vista, "Sin conexión"));
  assert.equal(buscar(vista, elemento => elemento.type === "textarea").props.value, "Borrador");
  assert.equal(buscar(vista, elemento => elemento.type === "select").props.value, 3);
  assert.equal(actualizarPublicas.mock.callCount(), 0);

  const actualizada = { ...propia, comentario: "Borrador", calificacion: 3 };
  updateOwnReview.mock.mockImplementationOnce(async () => actualizada);
  getOwnReviews.mock.mockImplementationOnce(async () => [actualizada]);
  guardar();
  await esperar();
  assert.deepEqual(updateOwnReview.mock.calls.at(-1).arguments, [
    propia.id, { id: propia.id, comentario: "Borrador", calificacion: 3 },
  ]);
  assert.ok(texto(renderizarPropias(), "Borrador"));
  assert.equal(buscar(renderizarPropias(), elemento => elemento.type === "form"), undefined);
  assert.equal(actualizarPublicas.mock.callCount(), 1);
  assert.equal(getOwnReviews.mock.callCount(), 2);
  limpiar();
});

test("eliminar solicita confirmación y refresca ambos listados solo tras el éxito", async () => {
  const confirm = mock.fn(() => false);
  globalThis.window = { confirm };
  try {
    const limpiar = montarPropias(async () => [propia]);
    await esperar();
    const eliminar = () => texto(renderizarPropias(), "Eliminar").props.onClick();
    eliminar();
    assert.equal(deleteOwnReview.mock.callCount(), 0);
    confirm.mock.mockImplementation(() => true);
    eliminar();
    eliminar();
    await esperar();
    assert.deepEqual(deleteOwnReview.mock.calls.map(llamada => llamada.arguments), [[propia.id]]);
    assert.ok(texto(renderizarPropias(), "Todavía no has publicado reseñas."));
    assert.equal(actualizarPublicas.mock.callCount(), 1);
    limpiar();
  } finally {
    delete globalThis.window;
  }
});

test("una edición que termina tras desmontar no refresca el listado del nuevo contexto", async () => {
  let resolver;
  const limpiar = montarPropias(async () => [propia]);
  updateOwnReview.mock.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  await esperar();
  texto(renderizarPropias(), "Editar").props.onClick();
  buscar(renderizarPropias(), elemento => elemento.type === "form").props.onSubmit({ preventDefault() {} });
  limpiar();
  const limpiarNuevo = montarPropias();
  await esperar();
  resolver(propia);
  await esperar();
  assert.equal(actualizarPublicas.mock.callCount(), 0);
  assert.ok(texto(renderizarPropias(), "Todavía no has publicado reseñas."));
  limpiarNuevo();
});

test("una eliminación fallida conserva la reseña, muestra el error y permite reintentar", async () => {
  const ventanaAnterior = globalThis.window;
  globalThis.window = { confirm: () => true };
  try {
    const limpiar = montarPropias(async () => [propia]);
    await esperar();
    deleteOwnReview.mock.mockImplementationOnce(async () => { throw new Error("Sin conexión al eliminar"); });
    texto(renderizarPropias(), "Eliminar").props.onClick();
    await esperar();
    const vista = renderizarPropias();
    assert.ok(texto(vista, "Sin conexión al eliminar"));
    assert.ok(texto(vista, propia.comentario));
    assert.equal(texto(vista, "Eliminar").props.disabled, false);
    assert.equal(getOwnReviews.mock.callCount(), 1);
    assert.equal(actualizarPublicas.mock.callCount(), 0);
    limpiar();
  } finally {
    if (ventanaAnterior === undefined) delete globalThis.window;
    else globalThis.window = ventanaAnterior;
  }
});

for (const cambio of ["sede", "usuario"]) {
  test(`el bloqueo de gestión sobrevive al cambio de ${cambio} y solo revalida para la misma cuenta`, async () => {
    const limpiar = await montar();
    const propsPropias = () => buscar(renderizar(), elemento => elemento.type === MisResenas);
    const anterior = propsPropias();
    assert.equal(anterior.props.iniciarGestion(), true);
    assert.equal(anterior.props.iniciarGestion(), false);
    limpiar();
    user = cambio === "sede" ? { ...user, sede: otraSede } : { ...user, idusuario: "cliente-2" };
    renderizar();
    const limpiarNuevo = efecto();
    await esperar();
    const actual = propsPropias();
    assert.notEqual(anterior.key, actual.key);
    assert.equal(actual.props.ocupado, true);
    assert.equal(actual.props.iniciarGestion(), false);
    anterior.props.finalizarGestion(true);
    const mismoUsuario = cambio === "sede";
    assert.equal(propsPropias().props.ocupado, false);
    assert.equal(propsPropias().props.version, mismoUsuario ? 1 : 0);
    assert.deepEqual(getPublicReviews.mock.calls.map(llamada => llamada.arguments),
      mismoUsuario ? [[sede], [otraSede], [otraSede]] : [[sede], [sede]]);
    limpiarNuevo();
  });
}

function paginaEjemplo({ promedio = 4, pagina = 1, total = 11, paginas = 2, resenas = [propia] } = {}) {
  return {
    resenas,
    estadisticas: { promedio, total, distribucion: [] },
    paginacion: { pagina, limite: 10, total: paginas ? total : 0, paginas },
  };
}

const resumen = vista => buscar(vista, elemento => elemento.type === ResumenResenas)?.props.estadisticas;
const filtroForm = vista => buscar(vista, elemento => elemento.props["aria-label"] === "Filtros de reseñas");

test("aplica filtros en la petición, pagina con los aplicados y permite restablecerlos", async () => {
  const limpiar = await montar();
  const formulario = () => filtroForm(renderizar());
  buscar(formulario(), elemento => elemento.type === "input").props.onChange({ target: { value: "  máquinas  " } });
  buscar(formulario(), elemento => elemento.type === "select" && elemento.props.value === "").props.onChange({
    target: { value: "5" },
  });
  buscar(formulario(), elemento => elemento.type === "select" && elemento.props.value === "recientes").props.onChange({
    target: { value: "mejor" },
  });
  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo());
  formulario().props.onSubmit({ preventDefault() {} });
  await esperar();
  const filtros = { buscar: "máquinas", calificacion: "5", orden: "mejor", pagina: 1 };
  assert.deepEqual(getPublicReviewPage.mock.calls.at(-1).arguments, [sede, filtros]);
  assert.equal(resumen(renderizar()).promedio, 4);
  assert.equal(texto(renderizar(), "Anterior").props.disabled, true);

  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({ pagina: 2 }));
  texto(renderizar(), "Siguiente").props.onClick();
  await esperar();
  assert.deepEqual(getPublicReviewPage.mock.calls.at(-1).arguments, [sede, { ...filtros, pagina: 2 }]);
  assert.equal(texto(renderizar(), "Siguiente").props.disabled, true);

  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({ resenas: [], paginas: 0 }));
  formulario().props.onSubmit({ preventDefault() {} });
  await esperar();
  assert.ok(texto(renderizar(), "Ninguna reseña coincide con los filtros."));
  assert.equal(resumen(renderizar()).total, 11);

  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo());
  texto(renderizar(), "Restablecer filtros").props.onClick();
  await esperar();
  assert.deepEqual(getPublicReviewPage.mock.calls.at(-1).arguments, [sede, {
    buscar: "", calificacion: "", orden: "recientes", pagina: 1,
  }]);
  assert.equal(texto(renderizar(), "Ninguna reseña coincide con los filtros."), undefined);
  limpiar();
});

for (const cambio of ["usuario", "sede"]) {
  test(`descarta una página y sus estadísticas cuando cambia el ${cambio}`, async () => {
    const limpiar = await montar();
    let resolver;
    getPublicReviewPage.mock.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
    const pendiente = texto(renderizar(), "Actualizar").props.onClick();
    assert.ok(texto(renderizar(), "Cargando reseñas…"));
    limpiar();
    user = cambio === "sede" ? { ...user, sede: otraSede } : { ...user, idusuario: "otra-cuenta" };
    getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({
      promedio: null, total: 0, paginas: 0, resenas: [],
    }));
    renderizar();
    const limpiarNueva = efecto();
    await esperar();
    resolver(paginaEjemplo({ promedio: 1 }));
    await pendiente;
    assert.equal(resumen(renderizar()).promedio, null);
    assert.equal(texto(renderizar(), propia.comentario), undefined);
    assert.ok(texto(renderizar(), "Todavía no hay reseñas disponibles."));
    limpiarNueva();
  });
}

test("el formulario limita la descripción y confirma la denuncia sin ocultar la tarjeta", async () => {
  const limpiar = await montar();
  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({
    resenas: [{ ...propia, puede_denunciar: true }],
  }));
  await texto(renderizar(), "Actualizar").props.onClick();
  const props = buscar(renderizar(), elemento => elemento.type === DenunciarResena).props;
  const estadoPagina = estado;
  const refsPagina = refs;
  estado = [];
  refs = [];
  reportReview.mock.resetCalls();
  const vista = () => {
    indiceEstado = 0;
    indiceRef = 0;
    return DenunciarResena(props);
  };
  texto(vista(), "Reportar reseña").props.onClick();
  buscar(vista(), elemento => elemento.type === "select").props.onChange({ target: { value: "SPAM" } });
  const campo = buscar(vista(), elemento => elemento.type === "textarea");
  assert.equal(campo.props.maxLength, 500);
  campo.props.onChange({ target: { value: "  Texto del caso  " } });
  await buscar(vista(), elemento => elemento.type === "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(reportReview.mock.calls[0].arguments, [propia.id, { motivo: "SPAM", descripcion: "Texto del caso" }]);
  assert.ok(texto(vista(), "Denuncia recibida."));
  estado = estadoPagina;
  refs = refsPagina;
  assert.ok(texto(renderizar(), propia.comentario));
  limpiar();
});

test("la cola solo se monta para sede asignada o superadministrador y distingue el alcance global", async () => {
  for (const [perfil, esperada] of [
    [{ tipo_usuario: "cliente", sede }, undefined],
    [{ tipo_usuario: "admin", sedes_administradas: [otraSede] }, undefined],
    [{ tipo_usuario: "admin", sedes_administradas: [sede] }, false],
    [{ tipo_usuario: "super_admin" }, true],
  ]) {
    const limpiar = await montar(perfil, sede);
    const cola = buscar(renderizar(), elemento => elemento.type === ColaModeracion);
    assert.equal(cola?.props.global, esperada);
    limpiar();
  }
});

test("actualiza el resumen tras publicar y cuando se refresca el listado después de editar o eliminar", async () => {
  const limpiar = await montar();
  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({ promedio: 1 }));
  await enviar(1);
  assert.equal(resumen(renderizar()).promedio, 1);
  const recargar = () => buscar(renderizar(), elemento => elemento.type === MisResenas).props.alCambiar();
  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({ promedio: 5 }));
  await recargar();
  assert.equal(resumen(renderizar()).promedio, 5);
  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({
    promedio: null, total: 0, paginas: 0, resenas: [],
  }));
  await recargar();
  assert.equal(resumen(renderizar()).total, 0);
  assert.ok(texto(ResumenResenas({ estadisticas: resumen(renderizar()) }), "Sin valoraciones"));
  limpiar();
});

test("gestión usa el filtro de pendientes y recarga la consulta autorizada después de responder", async () => {
  const limpiar = await montar({ tipo_usuario: "admin", sedes_administradas: [sede] }, sede);
  const filtro = buscar(filtroForm(renderizar()), elemento => elemento.type === "select" &&
    Boolean(texto(elemento, "Pendientes de respuesta")));
  filtro.props.onChange({ target: { value: "pendiente" } });
  getAdminReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo());
  filtroForm(renderizar()).props.onSubmit({ preventDefault() {} });
  await esperar();
  const gestionar = buscar(renderizar(), elemento => elemento.type === RespuestaOficial).props.gestionar;
  let completar;
  manageOfficialReply.mock.mockImplementationOnce(() => new Promise(resolve => { completar = resolve; }));
  const pendiente = gestionar("publicar", "Mensaje institucional");
  assert.equal(await gestionar("publicar", "Duplicada"), false);
  getAdminReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({ resenas: [], paginas: 0 }));
  completar();
  assert.equal(await pendiente, true);
  assert.deepEqual(manageOfficialReply.mock.calls[0].arguments, [propia.id, "publicar", "Mensaje institucional"]);
  assert.equal(manageOfficialReply.mock.callCount(), 1);
  assert.equal(getAdminReviewPage.mock.calls.at(-1).arguments[1].estadoRespuesta, "pendiente");
  assert.ok(texto(renderizar(), "Ninguna reseña coincide con los filtros."));
  limpiar();
});

test("la respuesta pública identifica al gimnasio y carece de acciones administrativas", async () => {
  const limpiar = await montar();
  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({
    resenas: [{ ...propia, respuesta: { texto: "<texto institucional>" } }],
  }));
  await texto(renderizar(), "Actualizar").props.onClick();
  const respuesta = buscar(renderizar(), elemento => elemento.type === RespuestaOficial);
  assert.equal(respuesta.props.gestionar, undefined);
  estado = [];
  indiceEstado = 0;
  const panel = RespuestaOficial(respuesta.props);
  assert.ok(texto(panel, "Respuesta oficial del gimnasio"));
  assert.ok(texto(panel, "<texto institucional>"));
  assert.equal(texto(panel, "Editar respuesta"), undefined);
  limpiar();
});

const sinVoto = { votos_utiles: 2, mi_voto_util: false, puede_votar: true };
const conVoto = { votos_utiles: 3, mi_voto_util: true, puede_votar: true };
const panelVoto = () => buscar(renderizar(), elemento => elemento.type === VotoUtil);

async function cargarTarjetaConVoto(voto = sinVoto) {
  getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({ resenas: [{ ...propia, ...voto }] }));
  await texto(renderizar(), "Actualizar").props.onClick();
}

test("el voto espera confirmación, bloquea duplicados y no pierde la respuesta oficial", async () => {
  const limpiar = await montar();
  const respuesta = { texto: "Respuesta existente" };
  const tarjeta = () => paginaEjemplo({ resenas: [{ ...propia, ...sinVoto, respuesta }] });
  getPublicReviewPage.mock.mockImplementationOnce(async () => tarjeta());
  await texto(renderizar(), "Actualizar").props.onClick();
  let confirmar;
  setHelpfulVote.mock.mockImplementationOnce(() => new Promise(resolve => { confirmar = resolve; }));
  const solicitud = panelVoto().props.alCambiar(true);
  assert.equal(panelVoto().props.pendiente, true);
  assert.equal(panelVoto().props.resena.mi_voto_util, false);
  await panelVoto().props.alCambiar(true);
  assert.equal(setHelpfulVote.mock.callCount(), 1);
  confirmar(conVoto);
  await solicitud;
  assert.deepEqual(setHelpfulVote.mock.calls[0].arguments, [propia.id, true]);
  const panel = VotoUtil(panelVoto().props);
  assert.equal(texto(panel, "Útil").props["aria-pressed"], true);
  assert.equal(panelVoto().props.resena.respuesta, respuesta);
  assert.equal(getPublicReviewPage.mock.callCount(), 2);

  setHelpfulVote.mock.mockImplementationOnce(async () => { throw new Error("Sin conexión"); });
  await panelVoto().props.alCambiar(false);
  assert.equal(panelVoto().props.resena.mi_voto_util, true);
  assert.equal(panelVoto().props.error, "Sin conexión");
  assert.equal(panelVoto().props.pendiente, false);
  setHelpfulVote.mock.mockImplementationOnce(async () => sinVoto);
  await panelVoto().props.alCambiar(false);
  assert.equal(panelVoto().props.resena.mi_voto_util, false);
  limpiar();
});

test("una lectura iniciada antes de confirmar el voto conserva el resultado confirmado", async () => {
  const limpiar = await montar();
  await cargarTarjetaConVoto();
  let terminarVoto;
  setHelpfulVote.mock.mockImplementationOnce(() => new Promise(resolve => { terminarVoto = resolve; }));
  const voto = panelVoto().props.alCambiar(true);
  let terminarLectura;
  getPublicReviewPage.mock.mockImplementationOnce(() => new Promise(resolve => { terminarLectura = resolve; }));
  const lectura = texto(renderizar(), "Actualizar").props.onClick();
  terminarVoto(conVoto);
  await voto;
  terminarLectura(paginaEjemplo({ resenas: [{ ...propia, ...sinVoto }] }));
  await lectura;
  assert.equal(panelVoto().props.resena.votos_utiles, 3);
  limpiar();
});

for (const cambio of ["usuario", "sede"]) {
  test(`el voto anterior no modifica la tarjeta tras cambiar de ${cambio}`, async () => {
    const limpiar = await montar();
    await cargarTarjetaConVoto();
    let confirmar;
    setHelpfulVote.mock.mockImplementationOnce(() => new Promise(resolve => { confirmar = resolve; }));
    const voto = panelVoto().props.alCambiar(true);
    limpiar();
    user = cambio === "sede" ? { ...user, sede: otraSede } : { ...user, idusuario: "otra-cuenta" };
    getPublicReviewPage.mock.mockImplementationOnce(async () => paginaEjemplo({
      resenas: [{ ...propia, ...sinVoto, puede_votar: false }],
    }));
    renderizar();
    const limpiarNueva = efecto();
    await esperar();
    confirmar(conVoto);
    await voto;
    assert.equal(panelVoto().props.resena.votos_utiles, 2);
    const panel = VotoUtil(panelVoto().props);
    assert.equal(buscar(panel, elemento => elemento.type === "button"), undefined);
    limpiarNueva();
  });
}
