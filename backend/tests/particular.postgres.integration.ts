import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { after, mock, test } from 'node:test';
import express, { type RequestHandler } from 'express';
import { errorHandler } from '../src/middleware/error.middleware.js';

const container = process.env.JJGYM_METRICAS_TEST_CONTAINER ?? '';
assert.match(container, /^[a-f0-9]{64}$/, 'Se requiere el ID del contenedor de pruebas recién creado.');

function docker(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile('docker', args, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout.trim());
    });
    child.stdin?.on('error', reject);
    child.stdin?.end(input);
  });
}

const purpose = await docker(['inspect', '--format', '{{index .Config.Labels "jjgym.purpose"}}', container]);
assert.equal(purpose, 'metricas-integration');

const usuario = '00000000-0000-4000-8000-000000000001';
const otroUsuario = '00000000-0000-4000-8000-000000000002';
const fecha = '2026-11-25T15:00:00.000Z';

const psql = (sql: string) => docker([
  'exec', '-i', container, 'psql', '-XqAt', '-v', 'ON_ERROR_STOP=1',
  '-U', 'metricas_test', '-d', 'metricas_test',
], sql);

await psql(`
  CREATE TABLE usuarios (idusuario UUID PRIMARY KEY);
  INSERT INTO usuarios VALUES ('${usuario}'), ('${otroUsuario}');
  CREATE TABLE metricas_diarias (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(idusuario),
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dia_local DATE NOT NULL,
    peso_actual_kg DOUBLE PRECISION,
    vasos_agua INTEGER NOT NULL DEFAULT 0,
    entrenamiento_completado BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (usuario_id, dia_local)
  );
`);

function literal(value: unknown): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return "'" + value.replaceAll("'", "''") + "'";
  throw new Error('Tipo de parámetro no admitido por la prueba de integración.');
}

// Ejecuta el SQL del repositorio en PostgreSQL con parámetros de PREPARE.
async function queryRaw(parts: TemplateStringsArray, ...params: unknown[]) {
  const sql = parts.map((part, index) => index === 0 ? part : '$' + index + part).join('');
  const result = await psql(`
    SET TIME ZONE 'Asia/Tokyo';
    PREPARE consulta AS WITH resultado AS (${sql})
      SELECT row_to_json(resultado) FROM resultado;
    EXECUTE consulta(${params.map(literal).join(', ')});
  `);
  return result ? result.split('\n').map((row) => JSON.parse(row)) : [];
}

const requireAuth: RequestHandler = (req, _res, next) => {
  req.userId = usuario;
  next();
};

mock.module(new URL('../src/lib/prisma.ts', import.meta.url).href, {
  namedExports: { prisma: { $queryRaw: queryRaw } },
});
mock.module(new URL('../src/middleware/auth.middleware.ts', import.meta.url).href, {
  namedExports: { requireAuth },
});

const { guardarMetricaDiaria, obtenerMetricaDiaria } = await import('../src/repositories/particular.repository.js');
const { createParticularRouter } = await import('../src/routes/particular.routes.js');
const app = express();
app.use(express.json());
app.use('/api/particular', createParticularRouter(true));
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
after(() => server.close());
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address === 'object');
const url = `http://127.0.0.1:${address.port}/api/particular/metrics`;

const guardar = (campos: Parameters<typeof guardarMetricaDiaria>[1]) =>
  guardarMetricaDiaria(usuario, campos, new Date(fecha));

test('crea el registro diario y aplica valores iniciales', async () => {
  const fila = await guardar({ pesoActualKg: 73.5 });
  assert.equal(fila.usuarioId, usuario);
  assert.equal(fila.pesoActualKg, 73.5);
  assert.equal(fila.vasosAgua, 0);
  assert.equal(fila.entrenamientoCompletado, false);
  assert.equal(await psql('SELECT dia_local FROM metricas_diarias;'), '2026-11-25');
});

test('actualiza el mismo ID varias veces y conserva los campos omitidos', async () => {
  const original = await obtenerMetricaDiaria(usuario, new Date(fecha));
  assert.ok(original);
  const agua = await guardar({ vasosAgua: 6 });
  const entrenamiento = await guardar({ entrenamientoCompletado: true });
  assert.equal(agua.id, original.id);
  assert.deepEqual(entrenamiento, { ...original, vasosAgua: 6, entrenamientoCompletado: true });
  assert.equal(await psql('SELECT count(*) FROM metricas_diarias;'), '1');
});

test('persiste cero y falso explícitos sobre valores previos', async () => {
  const fila = await guardar({ vasosAgua: 0, entrenamientoCompletado: false });
  assert.equal(fila.vasosAgua, 0);
  assert.equal(fila.entrenamientoCompletado, false);
  assert.equal(fila.pesoActualKg, 73.5);
});

test('dos POST simultáneos conservan ambos cambios en una sola fila', async () => {
  // Una fecha fija hace que la prueba también sea reproducible en medianoche.
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-26T15:00:00.000Z') });
  try {
    const post = (body: object) => fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responses = await Promise.all([post({ vasosAgua: 8 }), post({ entrenamientoCompletado: true })]);
    const results = await Promise.all(responses.map(async (response) => {
      const body = await response.json();
      assert.equal(response.status, 201, JSON.stringify(body));
      return body;
    }));
    assert.equal(results[0].data.id, results[1].data.id);
    const response = await fetch(url + '/hoy');
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.vasosAgua, 8);
    assert.equal(data.entrenamientoCompletado, true);
    assert.equal(await psql("SELECT count(*) FROM metricas_diarias WHERE dia_local = DATE '2026-11-26';"), '1');
  } finally {
    mock.timers.reset();
  }
});

test('mantiene separados dos usuarios en el mismo día', async () => {
  const otra = await guardarMetricaDiaria(otroUsuario, { pesoActualKg: 88 }, new Date(fecha));
  const primera = await obtenerMetricaDiaria(usuario, new Date(fecha));
  assert.equal(otra.usuarioId, otroUsuario);
  assert.notEqual(otra.id, primera?.id);
  assert.equal(primera?.pesoActualKg, 73.5);
  assert.equal(await psql("SELECT count(*) FROM metricas_diarias WHERE dia_local = DATE '2026-11-25';"), '2');
});

test('cambia de registro exactamente a medianoche de Bogotá', async () => {
  const antes = new Date('2026-12-01T04:59:59.999Z');
  const despues = new Date('2026-12-01T05:00:00.000Z');
  const previa = await guardarMetricaDiaria(usuario, { vasosAgua: 7 }, antes);
  assert.equal(await obtenerMetricaDiaria(usuario, despues), null);
  const nueva = await guardarMetricaDiaria(usuario, { vasosAgua: 1 }, despues);
  assert.notEqual(previa.id, nueva.id);
  assert.deepEqual(await obtenerMetricaDiaria(usuario, antes), previa);
  assert.deepEqual(await obtenerMetricaDiaria(usuario, despues), nueva);
  assert.equal(await psql("SELECT dia_local FROM metricas_diarias WHERE dia_local >= DATE '2026-11-30' ORDER BY dia_local;"),
    '2026-11-30\n2026-12-01');
});
