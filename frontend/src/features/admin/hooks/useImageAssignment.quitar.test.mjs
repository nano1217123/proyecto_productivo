import assert from "node:assert/strict";
import { mock, test } from "node:test";

mock.module(new URL("../api/adminApi.js", import.meta.url).href, {
  namedExports: { adminApi: {} },
});
mock.module(new URL("../../exercises/api/exercisesApi.js", import.meta.url).href, {
  namedExports: { exercisesApi: {} },
});

const { createImageAssignmentState, ejerciciosConImagen } = await import("./useImageAssignment.js");

const COMPARTIDA = "https://res.cloudinary.com/test/image/upload/v1/jjgym/compartida.jpg";
const ROTA = "https://res.cloudinary.com/test/image/upload/v1/jjgym/hx2moyodb4ekanw7tfq0.jpg";
const GRUPOS = [
  { slug: "pecho", nombre: "Pecho", ejercicios: [
    { id: 1, nombre: "Press de banca", imagen_url: COMPARTIDA },
    { id: 2, nombre: "Press inclinado con mancuernas", imagen_url: COMPARTIDA },
    { id: 3, nombre: "Aperturas con mancuernas", imagen_url: ROTA },
    { id: 4, nombre: "Fondos", imagen_url: null },
  ] },
  { slug: "hombros", nombre: "Hombros", ejercicios: [{ id: 9, nombre: "Press militar", imagen_url: COMPARTIDA }] },
];
const errorHttp = (status, message, body = { message }) => Object.assign(new Error(message), { status, body });
function diferida() {
  let resolve; let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const imagen = (c, id) => c.getSnapshot().grupos.flatMap((g) => g.ejercicios).find((e) => e.id === id).imagen_url;

async function preparado(quitarImagen = mock.fn(async () => ({ imagenUrl: null })), extra = {}) {
  const c = createImageAssignmentState({
    cargarCatalogo: async () => structuredClone(GRUPOS),
    subir: extra.subir || (async () => ({ url: "https://img.test/nueva.jpg" })),
    asignar: extra.asignar || (async () => ({})),
    quitarImagen,
  });
  await c.recargarCatalogo();
  c.seleccionarGrupo("pecho");
  return { c, quitarImagen };
}

test("solo se puede pedir quitar cuando el ejercicio tiene imagen, y se guarda la imagen vista", async () => {
  const { c } = await preparado();
  c.pedirQuitar();
  assert.equal(c.getSnapshot().quitar.fase, "inactivo", "sin ejercicio elegido");
  c.seleccionarEjercicio(4);
  c.pedirQuitar();
  assert.equal(c.getSnapshot().quitar.fase, "inactivo", "sin imagen asignada");
  c.seleccionarEjercicio(3);
  c.pedirQuitar();
  const { quitar } = c.getSnapshot();
  assert.equal(quitar.fase, "confirmando");
  assert.equal(quitar.imagenVista, ROTA);
  assert.deepEqual(quitar.destino, { ejercicioId: 3, ejercicioNombre: "Aperturas con mancuernas", grupoNombre: "Pecho" });
  assert.deepEqual(quitar.compartidaCon, []);
});

test("cancelar el diálogo no envía nada ni cambia el catálogo", async () => {
  const { c, quitarImagen } = await preparado();
  c.seleccionarEjercicio(1);
  const antes = c.getSnapshot().grupos;
  c.pedirQuitar();
  c.cancelarQuitar();
  assert.equal(c.getSnapshot().quitar.fase, "inactivo");
  assert.equal(c.getSnapshot().grupos, antes);
  await c.confirmarQuitar();
  assert.equal(quitarImagen.mock.callCount(), 0, "confirmar después de cancelar no hace nada");
});

test("al quitar una imagen compartida, los demás ejercicios la conservan", async () => {
  const { c, quitarImagen } = await preparado();
  c.seleccionarEjercicio(1);
  c.pedirQuitar();
  assert.deepEqual(c.getSnapshot().quitar.compartidaCon.map((e) => e.id), [2, 9]);
  await Promise.all([c.confirmarQuitar(), c.confirmarQuitar()]);
  assert.equal(quitarImagen.mock.callCount(), 1, "doble clic: una sola petición");
  assert.deepEqual(quitarImagen.mock.calls[0].arguments, [1, COMPARTIDA]);
  assert.equal(c.getSnapshot().quitar.fase, "exito");
  assert.equal(imagen(c, 1), null);
  assert.equal(imagen(c, 2), COMPARTIDA);
  assert.equal(imagen(c, 9), COMPARTIDA);
  assert.deepEqual(ejerciciosConImagen(c.getSnapshot().grupos, COMPARTIDA, 2).map((e) => e.id), [9]);
});

test("Aperturas con mancuernas: el servidor confirma con una respuesta simulada y el panel queda sin imagen", async () => {
  const respuesta = { message: "Imagen quitada del ejercicio.", imagenUrl: null };
  const { c, quitarImagen } = await preparado(mock.fn(async () => respuesta));
  c.seleccionarEjercicio(3);
  c.pedirQuitar();
  await c.confirmarQuitar();
  assert.deepEqual(quitarImagen.mock.calls[0].arguments, [3, ROTA]);
  assert.equal(imagen(c, 3), null);
  assert.equal(c.getSnapshot().quitar.destino.ejercicioNombre, "Aperturas con mancuernas");
});

test("si otro administrador la reemplazó, el 409 actualiza la imagen que muestra el panel", async () => {
  const nueva = "https://res.cloudinary.com/test/image/upload/v2/jjgym/nueva.jpg";
  const { c } = await preparado(mock.fn(async () => {
    throw errorHttp(409, "Otro administrador cambió la imagen de este ejercicio.", { message: "x", imagenUrl: nueva });
  }));
  c.seleccionarEjercicio(3);
  c.pedirQuitar();
  await c.confirmarQuitar();
  const { quitar } = c.getSnapshot();
  assert.equal(quitar.fase, "conflicto");
  assert.equal(quitar.imagenVigente, nueva);
  assert.match(quitar.mensaje, /Otro administrador/);
  assert.equal(imagen(c, 3), nueva);
  assert.equal(imagen(c, 1), COMPARTIDA, "solo cambia ese ejercicio");
});

test("si otro administrador ya la quitó, el 409 deja el ejercicio sin imagen", async () => {
  const { c } = await preparado(mock.fn(async () => {
    throw errorHttp(409, "Otro administrador ya quitó la imagen de este ejercicio.", { message: "x", imagenUrl: null });
  }));
  c.seleccionarEjercicio(3);
  c.pedirQuitar();
  await c.confirmarQuitar();
  assert.equal(c.getSnapshot().quitar.fase, "conflicto");
  assert.equal(imagen(c, 3), null);
});

test("un 404 o un error de red se informan sin cambiar el catálogo", async () => {
  for (const [error, patron] of [[errorHttp(404, "El ejercicio no existe."), /ya no existe/], [errorHttp(0, "No se pudo contactar al servidor."), /contactar/]]) {
    const { c } = await preparado(mock.fn(async () => { throw error; }));
    c.seleccionarEjercicio(3);
    c.pedirQuitar();
    await c.confirmarQuitar();
    assert.equal(c.getSnapshot().quitar.fase, "error");
    assert.match(c.getSnapshot().quitar.mensaje, patron);
    assert.equal(imagen(c, 3), ROTA);
  }
});

test("mientras se quita, la selección y la subida quedan bloqueadas", async () => {
  const pendiente = diferida();
  const subir = mock.fn(async () => ({ url: "https://img.test/x.jpg" }));
  const { c } = await preparado(mock.fn(() => pendiente.promise), { subir });
  c.seleccionarEjercicio(3);
  c.seleccionarArchivo({ name: "a.png", type: "image/png", size: 10 });
  c.pedirQuitar();
  const confirmacion = c.confirmarQuitar();
  assert.equal(c.getSnapshot().quitar.fase, "quitando");
  c.seleccionarEjercicio(1);
  c.seleccionarGrupo("hombros");
  await c.enviar();
  assert.equal(c.getSnapshot().ejercicioId, "3");
  assert.equal(c.getSnapshot().grupoSlug, "pecho");
  assert.equal(subir.mock.callCount(), 0);
  pendiente.resolve({ imagenUrl: null });
  await confirmacion;
  assert.equal(c.getSnapshot().quitar.fase, "exito");
});

test("no se ofrece quitar durante una subida ni con una asignación pendiente de reintento", async () => {
  const subida = diferida();
  const { c, quitarImagen } = await preparado(undefined, { subir: () => subida.promise, asignar: async () => { throw new Error("fallo"); } });
  c.seleccionarEjercicio(1);
  c.seleccionarArchivo({ name: "a.png", type: "image/png", size: 10 });
  const envio = c.enviar();
  c.pedirQuitar();
  assert.equal(c.getSnapshot().quitar.fase, "inactivo", "durante la subida");
  subida.resolve({ url: "https://img.test/x.jpg" });
  await envio;
  assert.equal(c.getSnapshot().fase, "error-asignacion");
  c.pedirQuitar();
  assert.equal(c.getSnapshot().quitar.fase, "inactivo", "con reintento pendiente");
  assert.equal(quitarImagen.mock.callCount(), 0);
});

test("elegir otro ejercicio limpia el resultado y una respuesta tras desmontar se descarta", async () => {
  const pendiente = diferida();
  const { c } = await preparado(mock.fn(async () => ({ imagenUrl: null })));
  c.seleccionarEjercicio(3);
  c.pedirQuitar();
  await c.confirmarQuitar();
  c.seleccionarEjercicio(1);
  assert.equal(c.getSnapshot().quitar.fase, "inactivo");

  const otro = await preparado(mock.fn(() => pendiente.promise));
  otro.c.seleccionarEjercicio(1);
  otro.c.pedirQuitar();
  const confirmacion = otro.c.confirmarQuitar();
  otro.c.cancelar();
  pendiente.resolve({ imagenUrl: null });
  await confirmacion;
  assert.equal(otro.c.getSnapshot().quitar.fase, "quitando", "no aplica el resultado tras desmontar");
  assert.equal(imagen(otro.c, 1), COMPARTIDA);
});
