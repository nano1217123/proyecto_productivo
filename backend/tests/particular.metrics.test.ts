import assert from 'node:assert/strict';
import { after, test, mock } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import type { RequestHandler } from 'express';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { guardarMetricasSchema } from '../src/validator/particular.validator.js';

const usuarioId = 'usuario-de-sesion';
const create = mock.fn(async ({ data }: { data: Record<string, unknown> }) => data);
const findFirst = mock.fn(async (_query: { where: { usuarioId: string } }) => null);
const requireAuth: RequestHandler = (req, _res, next) => {
  if (req.get('x-test-session') === 'valid') req.userId = usuarioId;
  next();
};
mock.module(new URL('../src/lib/prisma.ts', import.meta.url).href, {
  namedExports: { prisma: { metricaDiaria: { create, findFirst } } },
});
mock.module(new URL('../src/middleware/auth.middleware.ts', import.meta.url).href, {
  namedExports: { requireAuth },
});

const { default: router } = await import('../src/routes/particular.routes.js');
const { crearMetrica } = await import('../src/repositories/particular.repository.js');
const app = express();
app.use(express.json());
app.use('/api/particular', router);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
after(() => server.close());
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address === 'object');
const metricsUrl = `http://127.0.0.1:${address.port}/api/particular/metrics`;

function post(body: unknown, authenticated = true) {
  return fetch(metricsUrl, {
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
