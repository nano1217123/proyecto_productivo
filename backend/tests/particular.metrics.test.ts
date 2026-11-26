import assert from 'node:assert/strict';
import { after, test, mock } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import type { RequestHandler } from 'express';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { actualizarMetricasSchema, guardarMetricasSchema } from '../src/validator/particular.validator.js';

const usuarioId = 'usuario-de-sesion';
const proyeccionPublica = {
  id: true, usuarioId: true, fecha: true, pesoActualKg: true, vasosAgua: true, entrenamientoCompletado: true,
};
const create = mock.fn(async ({ data }: { data: Record<string, unknown> }) => data);
const findFirst = mock.fn(async (
  _query: { where: { usuarioId: string; fecha: { gte: Date } } },
): Promise<Record<string, unknown> | null> => null);
const queryRaw = mock.fn(async (_sql: TemplateStringsArray, ..._params: unknown[]): Promise<unknown[]> => []);
const requireAuth: RequestHandler = (req, _res, next) => {
  if (req.get('x-test-session') === 'valid') req.userId = usuarioId;
  next();
};
mock.module(new URL('../src/lib/prisma.ts', import.meta.url).href, {
  namedExports: { prisma: { metricaDiaria: { create, findFirst }, $queryRaw: queryRaw } },
});
mock.module(new URL('../src/middleware/auth.middleware.ts', import.meta.url).href, {
  namedExports: { requireAuth },
});

delete process.env.PARTICULAR_METRICAS_DIARIAS;
const { default: router, createParticularRouter } = await import('../src/routes/particular.routes.js');
const { crearMetrica } = await import('../src/repositories/particular.repository.js');
const app = express();
app.use(express.json());
app.use('/api/particular', router);
app.use('/test/diario', createParticularRouter(true));
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
after(() => server.close());
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address === 'object');
const metricsUrl = `http://127.0.0.1:${address.port}/api/particular/metrics`;
const diarioUrl = `http://127.0.0.1:${address.port}/test/diario/metrics`;

function post(body: unknown, authenticated = true, url = metricsUrl) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-session': authenticated ? 'valid' : '',
    },
    body: JSON.stringify(body),
  });
}

test('valida y aplica defaults sin persistir campos administrados por el servidor', async () => {
  const body = { pesoActualKg: 70, usuarioId: 'otra-cuenta', id: 'otro-id', fecha: '2000-01-01' };
  const metricas = { pesoActualKg: 70, vasosAgua: 0, entrenamientoCompletado: false };
  assert.deepEqual(guardarMetricasSchema.parse({ body }).body, metricas);

  const response = await post(body);
  assert.equal(response.status, 201);
  const data = { usuarioId, ...metricas };
  assert.deepEqual(await response.json(), { success: true, data });
  assert.deepEqual(create.mock.calls.at(-1)?.arguments, [{ data, select: proyeccionPublica }]);
});

test('el repositorio protege los campos de servidor aun si el objeto contiene campos adicionales', async () => {
  const input = {
    usuarioId: 'otra-cuenta',
    id: 'otro-id',
    fecha: '2000-01-01',
    pesoActualKg: 72,
    vasosAgua: 3,
    entrenamientoCompletado: true,
  };
  await crearMetrica(usuarioId, input);
  assert.deepEqual(create.mock.calls.at(-1)?.arguments, [{
    data: { usuarioId, pesoActualKg: 72, vasosAgua: 3, entrenamientoCompletado: true },
    select: proyeccionPublica,
  }]);
});

test('rechaza valores fuera de rango o con tipos incorrectos antes de persistir', async () => {
  const before = create.mock.callCount();
  for (const body of [{ pesoActualKg: 301 }, { vasosAgua: -1 }, { vasosAgua: 1.5 },
    { entrenamientoCompletado: 'true' }, { pesoActualKg: '70' }]) {
    const response = await post(body);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { success: false, message: 'Las métricas enviadas no son válidas.' });
  }
  assert.equal(create.mock.callCount(), before);
});

test('no toma la identidad del cuerpo si falta req.userId', async () => {
  const before = create.mock.callCount();
  const response = await post({ usuarioId }, false);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
  assert.equal(create.mock.callCount(), before);
});

test('conserva la respuesta de consulta cuando no hay métricas', async () => {
  const response = await fetch(`${metricsUrl}/hoy`, { headers: { 'x-test-session': 'valid' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: null });
  assert.equal(findFirst.mock.calls.at(-1)?.arguments[0].where.usuarioId, usuarioId);
});

test('el manejador central devuelve un error genérico si falla Prisma', async () => {
  create.mock.mockImplementationOnce(async () => {
    throw new Error('detalle interno de prueba');
  });
  const response = await post({});
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: 'Ocurrió un error inesperado en el servidor.' });
});

test('el modo predeterminado conserva el contrato e ignora diaEsperado', async () => {
  const response = await post({ diaEsperado: 'inválido' });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    success: true, data: { usuarioId, vasosAgua: 0, entrenamientoCompletado: false },
  });
  const consulta = await fetch(`${metricsUrl}/hoy`, { headers: { 'x-test-session': 'valid' } });
  assert.equal(consulta.status, 200);
  assert.deepEqual(await consulta.json(), { success: true, data: null });
  assert.equal(queryRaw.mock.callCount(), 0);
});

const diaEsperado = '2026-11-25';
const instante = '2026-11-25T15:00:00.000Z';

test('el GET del modo desactivado devuelve exactamente success y data con una fila existente', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(instante) });
  const fila = {
    id: 'metrica-legacy',
    usuarioId,
    fecha: instante,
    pesoActualKg: 70,
    vasosAgua: 4,
    entrenamientoCompletado: false,
  };
  findFirst.mock.mockImplementationOnce(async () => fila);
  const consultasSql = queryRaw.mock.callCount();

  const response = await fetch(`${metricsUrl}/hoy`, { headers: { 'x-test-session': 'valid' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: fila });
  const inicio = new Date(instante);
  inicio.setHours(0, 0, 0, 0);
  assert.deepEqual(findFirst.mock.calls.at(-1)?.arguments, [
    { where: { usuarioId, fecha: { gte: inicio } }, select: proyeccionPublica },
  ]);
  assert.equal(queryRaw.mock.callCount(), consultasSql);
});

test('un fallo de persistencia del POST diario devuelve solo el error genérico del servidor', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(instante) });
  const registroError = t.mock.method(console, 'error', () => {});
  const errorInterno = new Error(
    'INSERT INTO metricas_diarias falló. Credencial ficticia=prueba-secreta. Detalle interno del repositorio.',
  );
  queryRaw.mock.mockImplementationOnce(async () => { throw errorInterno; });
  const consultasSql = queryRaw.mock.callCount();

  const response = await post({ diaEsperado, vasosAgua: 0 }, true, diarioUrl);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: 'Ocurrió un error inesperado en el servidor.' });
  assert.equal(queryRaw.mock.callCount(), consultasSql + 1);
  assert.equal(registroError.mock.calls[0]?.arguments[1], errorInterno);
});

test('el esquema parcial conserva la ausencia y admite cero y falso explícitos', () => {
  assert.deepEqual(actualizarMetricasSchema.parse({ body: { usuarioId, diaEsperado, vasosAgua: 0 } }).body,
    { diaEsperado, vasosAgua: 0 });
  assert.deepEqual(actualizarMetricasSchema.parse({
    body: { diaEsperado, vasosAgua: 0, entrenamientoCompletado: false },
  }).body, { diaEsperado, vasosAgua: 0, entrenamientoCompletado: false });
  assert.equal(actualizarMetricasSchema.safeParse({ body: { diaEsperado, pesoActualKg: null } }).success, false);
});

test('el modo diario devuelve metadatos con fila y con data null', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(instante) });
  const fila = { id: 'canonica', usuarioId, pesoActualKg: 70, vasosAgua: 4, entrenamientoCompletado: false };
  queryRaw.mock.mockImplementationOnce(async () => [fila]);
  const response = await post({ diaEsperado, entrenamientoCompletado: false, usuarioId: 'otro' }, true, diarioUrl);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { success: true, data: fila, diaLocal: diaEsperado });
  const [sql, , propietario, fecha, dia, ...campos] = queryRaw.mock.calls.at(-1)!.arguments;
  assert.equal(propietario, usuarioId);
  assert.equal(fecha, instante);
  assert.equal(dia, diaEsperado);
  assert.match(sql.join('?'), /ON CONFLICT \(usuario_id, dia_local\) DO UPDATE/);
  assert.deepEqual(campos, [null, 0, false, false, false, true]);

  queryRaw.mock.mockImplementationOnce(async () => [fila]);
  for (const data of [fila, null]) {
    const consulta = await fetch(`${diarioUrl}/hoy`, { headers: { 'x-test-session': 'valid' } });
    assert.equal(consulta.status, 200);
    assert.equal(consulta.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await consulta.json(), {
      success: true, data, capacidades: { actualizacionParcial: true }, diaLocal: diaEsperado,
    });
    const [select, usuario, diaConsulta] = queryRaw.mock.calls.at(-1)!.arguments;
    assert.match(select.join('?'), /AND dia_local = \?::date/);
    assert.equal(usuario, usuarioId);
    assert.equal(diaConsulta, diaEsperado);
  }
});

test('el modo diario rechaza solicitudes inválidas o sin identidad antes de consultar', async () => {
  const before = queryRaw.mock.callCount();
  const invalid = await post({ diaEsperado, vasosAgua: 21 }, true, diarioUrl);
  assert.equal(invalid.status, 400);
  await invalid.json();
  const unauthenticated = await post({ usuarioId, diaEsperado, vasosAgua: 0 }, false, diarioUrl);
  assert.equal(unauthenticated.status, 401);
  await unauthenticated.json();
  assert.equal(queryRaw.mock.callCount(), before);
});

test('el modo diario devuelve 400 si falta el día, la fecha no existe o faltan métricas', async () => {
  const before = queryRaw.mock.callCount();
  for (const body of [
    {}, { diaEsperado }, { diaEsperado, usuarioId: 'otra-cuenta' }, { vasosAgua: 0 },
    { diaEsperado: '2026-02-29', vasosAgua: 0 }, { diaEsperado: '2026-04-31', vasosAgua: 0 },
    { diaEsperado: '2026-1-25', vasosAgua: 0 }, { diaEsperado: instante, vasosAgua: 0 },
  ]) {
    const response = await post(body, true, diarioUrl);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      message: 'Las métricas enviadas no son válidas.',
    });
  }
  assert.equal(queryRaw.mock.callCount(), before);
});

test('el modo diario acepta cada métrica por separado, incluidos cero y falso', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(instante) });
  for (const body of [{ pesoActualKg: 70.5 }, { vasosAgua: 0 }, { entrenamientoCompletado: false }]) {
    const fila = { id: 'canonica', usuarioId, ...body };
    queryRaw.mock.mockImplementationOnce(async () => [fila]);
    const response = await post({ diaEsperado, ...body }, true, diarioUrl);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { success: true, data: fila, diaLocal: diaEsperado });
  }
});

test('medianoche en Bogotá invalida el día anterior sin escribir y conserva la clave de una operación aceptada', async (t) => {
  const anterior = '2026-12-01T04:59:59.999Z';
  const siguiente = '2026-12-01T05:00:00.000Z';
  t.mock.timers.enable({ apis: ['Date'], now: new Date(anterior) });
  const anteriorGet = await fetch(`${diarioUrl}/hoy`, { headers: { 'x-test-session': 'valid' } });
  assert.equal((await anteriorGet.json()).diaLocal, '2026-11-30');

  queryRaw.mock.mockImplementationOnce(async () => {
    t.mock.timers.setTime(Date.parse(siguiente));
    return [{ id: 'canonica' }];
  });
  const aceptada = await post({ diaEsperado: '2026-11-30', vasosAgua: 0 }, true, diarioUrl);
  assert.equal(aceptada.status, 201);
  assert.equal((await aceptada.json()).diaLocal, '2026-11-30');
  assert.deepEqual(queryRaw.mock.calls.at(-1)!.arguments.slice(3, 5), [anterior, '2026-11-30']);

  const antes = queryRaw.mock.callCount();
  for (const dia of ['2026-11-30', '2026-12-02']) {
    const conflicto = await post({ diaEsperado: dia, vasosAgua: 0 }, true, diarioUrl);
    assert.equal(conflicto.status, 409);
    assert.deepEqual(await conflicto.json(), {
      success: false,
      codigo: 'DIA_METRICAS_CAMBIO',
      message: 'Cambió el día de las métricas. Revisa tus cambios antes de guardar.',
      diaLocal: '2026-12-01',
    });
  }
  assert.equal(queryRaw.mock.callCount(), antes);

  queryRaw.mock.mockImplementationOnce(async () => [{ id: 'nueva' }]);
  const vigente = await post({ diaEsperado: '2026-12-01', entrenamientoCompletado: false }, true, diarioUrl);
  assert.equal(vigente.status, 201);
  assert.equal((await vigente.json()).diaLocal, '2026-12-01');
  assert.deepEqual(queryRaw.mock.calls.at(-1)!.arguments.slice(3, 5), [siguiente, '2026-12-01']);
});
