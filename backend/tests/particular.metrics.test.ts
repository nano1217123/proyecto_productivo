import assert from 'node:assert/strict';
import { after, test, mock } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import type { RequestHandler } from 'express';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { actualizarMetricasSchema, guardarMetricasSchema } from '../src/validator/particular.validator.js';

const usuarioId = 'usuario-de-sesion';
const create = mock.fn(async ({ data }: { data: Record<string, unknown> }) => data);
const findFirst = mock.fn(async (_query: { where: { usuarioId: string } }) => null);
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
const { crearMetrica, guardarMetricaDiaria, obtenerMetricaDiaria } = await import('../src/repositories/particular.repository.js');
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
  assert.deepEqual(create.mock.calls.at(-1)?.arguments, [{ data }]);
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

test('el modo predeterminado nunca consulta dia_local', async () => {
  const response = await post({});
  assert.equal(response.status, 201);
  await response.json();
  const consulta = await fetch(`${metricsUrl}/hoy`, { headers: { 'x-test-session': 'valid' } });
  assert.equal(consulta.status, 200);
  await consulta.json();
  assert.equal(queryRaw.mock.callCount(), 0);
});

test('el esquema parcial conserva la ausencia y admite cero y falso explícitos', () => {
  assert.deepEqual(actualizarMetricasSchema.parse({ body: { usuarioId, vasosAgua: 0 } }).body, { vasosAgua: 0 });
  assert.deepEqual(actualizarMetricasSchema.parse({
    body: { vasosAgua: 0, entrenamientoCompletado: false },
  }).body, { vasosAgua: 0, entrenamientoCompletado: false });
  assert.equal(actualizarMetricasSchema.safeParse({ body: { pesoActualKg: null } }).success, false);
});

test('el modo diario mantiene el contrato HTTP y consulta por día de Bogotá', async () => {
  const fila = { id: 'canonica', usuarioId, pesoActualKg: 70, vasosAgua: 4, entrenamientoCompletado: false };
  queryRaw.mock.mockImplementationOnce(async () => [fila]);
  const response = await post({ entrenamientoCompletado: false, usuarioId: 'otro' }, true, diarioUrl);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { success: true, data: fila });
  const [sql, , propietario, fecha, dia, ...campos] = queryRaw.mock.calls.at(-1)!.arguments;
  assert.equal(propietario, usuarioId);
  assert.equal(fecha, dia);
  assert.match(sql.join('?'), /ON CONFLICT \(usuario_id, dia_local\) DO UPDATE/);
  assert.match(sql.join('?'), /AT TIME ZONE 'America\/Bogota'/);
  assert.deepEqual(campos, [null, 0, false, false, false, true]);

  const consulta = await fetch(`${diarioUrl}/hoy`, { headers: { 'x-test-session': 'valid' } });
  assert.equal(consulta.status, 200);
  assert.deepEqual(await consulta.json(), { success: true, data: null });
  const [select, usuario] = queryRaw.mock.calls.at(-1)!.arguments;
  assert.match(select.join('?'), /AND dia_local = .*America\/Bogota/);
  assert.equal(usuario, usuarioId);
});

test('el modo diario rechaza solicitudes inválidas o sin identidad antes de consultar', async () => {
  const before = queryRaw.mock.callCount();
  const invalid = await post({ vasosAgua: 21 }, true, diarioUrl);
  assert.equal(invalid.status, 400);
  await invalid.json();
  const unauthenticated = await post({ usuarioId, vasosAgua: 0 }, false, diarioUrl);
  assert.equal(unauthenticated.status, 401);
  await unauthenticated.json();
  assert.equal(queryRaw.mock.callCount(), before);
});

test('el modo diario devuelve 400 si el cuerpo no contiene ninguna métrica reconocida', async () => {
  const before = queryRaw.mock.callCount();
  for (const body of [{}, { usuarioId: 'otra-cuenta', diaLocal: '2026-11-25' }]) {
    const response = await post(body, true, diarioUrl);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      message: 'Las métricas enviadas no son válidas.',
    });
  }
  assert.equal(queryRaw.mock.callCount(), before);
});

test('el modo diario acepta cada métrica por separado, incluidos cero y falso', async () => {
  for (const body of [{ pesoActualKg: 70.5 }, { vasosAgua: 0 }, { entrenamientoCompletado: false }]) {
    const fila = { id: 'canonica', usuarioId, ...body };
    queryRaw.mock.mockImplementationOnce(async () => [fila]);
    const response = await post(body, true, diarioUrl);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { success: true, data: fila });
  }
});

test('el repositorio parametriza el instante exacto a ambos lados de medianoche en Bogotá', async () => {
  const anterior = '2026-11-25T04:59:59.999Z';
  const siguiente = '2026-11-25T05:00:00.000Z';
  queryRaw.mock.mockImplementationOnce(async () => [{ id: 'canonica' }]);
  await guardarMetricaDiaria(usuarioId, { vasosAgua: 0 }, new Date(anterior));
  assert.deepEqual(queryRaw.mock.calls.at(-1)!.arguments.slice(3), [
    anterior, anterior, null, 0, false, false, true, false,
  ]);
  await obtenerMetricaDiaria(usuarioId, new Date(siguiente));
  assert.deepEqual(queryRaw.mock.calls.at(-1)!.arguments.slice(1), [usuarioId, siguiente]);
});
