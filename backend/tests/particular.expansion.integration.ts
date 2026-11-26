import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readdirSync, readFileSync } from 'node:fs';
import { after, mock, test } from 'node:test';
import { PrismaNeon } from '@prisma/adapter-neon';
import express from 'express';
import postgres from 'postgres';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

const id = process.env.JJGYM_EXPANSION_CONTAINER ?? '';
assert.match(id, /^[a-f0-9]{64}$/);
const docker = (args: string[], input?: string) =>
  execFileSync('docker', args, { input, encoding: 'utf8' }).trim();
const [container] = JSON.parse(docker(['container', 'inspect', id]));
const etiqueta = container.Config.Labels['jjgym.expansion'];
assert.ok(typeof etiqueta === 'string' && etiqueta.startsWith('jjgym-metricas-expansion-'));
assert.equal(container.Name, '/' + etiqueta);
const [binding] = container.NetworkSettings.Ports['5432/tcp'];
assert.equal(binding.HostIp, '127.0.0.1');
assert.match(binding.HostPort, /^\d{1,5}$/);

const database = 'metricas_expansion_' + randomUUID().replaceAll('-', '');
const autorizacionArchivo = randomUUID();
const usuario = '00000000-0000-4000-8000-000000000001';
const segundoUsuario = '00000000-0000-4000-8000-000000000002';
docker(['exec', id, 'createdb', '-U', 'metricas_test', database]);
const psql = (sql: string, ...opts: string[]) => docker([
  'exec', '-i', id, 'psql', '-XqAt', '-v', 'ON_ERROR_STOP=1', '-U', 'metricas_test', '-d', database,
  ...opts,
], sql);
const migrations = new URL('../prisma/migrations/', import.meta.url);
const expansion = '20261125120000_metricas_dia_local_nullable';
const migrar = (name: string) => psql(
  readFileSync(new URL(name + '/migration.sql', migrations), 'utf8'), '--single-transaction', '-f', '-',
);
const leerScript = (name: string) =>
  readFileSync(new URL('../scripts/metricas/' + name, import.meta.url), 'utf8');
const archivo = (lote: string, destino = database, autorizacion = autorizacionArchivo) =>
  psql(leerScript('archivar-duplicados.sql'),
    '-v', 'VERBOSITY=verbose', '-v', 'modo=ensayo-local', '-v', 'destino=' + destino,
    '-v', 'autorizacion=' + autorizacion, '-v', 'lote=' + lote);
const activas = () => psql('SELECT to_jsonb(m) FROM metricas_diarias m ORDER BY id;');
const originales = () => psql('SELECT to_jsonb(a) FROM metricas_migracion.originales a ORDER BY lote, original_id;');
const lotes = () => psql('SELECT to_jsonb(l) FROM metricas_migracion.lotes l ORDER BY lote;');

function comprobarRechazo(accion: () => string, motivo: RegExp) {
  const antes = { activas: activas(), originales: originales(), lotes: lotes() };
  assert.throws(accion, (error: unknown) => motivo.test(String(error)));
  assert.deepEqual({ activas: activas(), originales: originales(), lotes: lotes() }, antes);
}

// Usa Prisma Client y su adaptador real. Solo el transporte se cambia a TCP local.
const conexion = {
  host: '127.0.0.1', port: Number(binding.HostPort), database,
  user: 'metricas_test', password: 'solo-pruebas-locales',
};
const sql = postgres({ ...conexion, ssl: false });
const adapter = new PrismaNeon(conexion);
const driver = await adapter.connect();
const pool = driver.underlyingDriver();
pool.query = (async (query: { text: string }, args: never[]) => {
  const rows = await sql.unsafe(query.text, args).values();
  return {
    rows: rows.map((row) => row.map((value) => value instanceof Date ? value.toISOString() : value)),
    fields: rows.columns.map((column) => ({ name: column.name, dataTypeID: column.type })),
    rowCount: rows.count,
  };
}) as typeof pool.query;
pool.end = (() => sql.end()) as typeof pool.end;
adapter.connect = async () => driver;
const prisma = new PrismaClient({ adapter });
after(() => prisma.$disconnect());

mock.module(new URL('../src/lib/prisma.ts', import.meta.url).href, { namedExports: { prisma } });
mock.module(new URL('../src/middleware/auth.middleware.ts', import.meta.url).href, {
  namedExports: { requireAuth: (req, _res, next) => { req.userId = req.get('x-usuario-sintetico'); next(); } },
});
const { createParticularRouter } = await import('../src/routes/particular.routes.js');
const app = express();
app.use(express.json());
app.use('/api/particular', createParticularRouter(false));
app.use(errorHandler);
const servidor = app.listen(0, '127.0.0.1');
after(() => servidor.close());
await once(servidor, 'listening');
const address = servidor.address();
assert.ok(address && typeof address === 'object');
const url = `http://127.0.0.1:${address.port}/api/particular/metrics`;

async function comprobarContrato(usuarioId: string) {
  const headers = { 'x-usuario-sintetico': usuarioId };
  const data = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ vasosAgua: 0, entrenamientoCompletado: false }),
  });
  const cuerpo = await data.json();
  assert.equal(data.status, 201, JSON.stringify(cuerpo));
  assert.deepEqual(cuerpo, {
    success: true,
    data: { id: cuerpo.data.id, usuarioId, fecha: cuerpo.data.fecha,
      pesoActualKg: null, vasosAgua: 0, entrenamientoCompletado: false },
  });
  const get = await fetch(url + '/hoy', { headers });
  assert.equal(get.status, 200);
  assert.deepEqual(await get.json(), cuerpo);
}

test('reproduce todo el historial y conserva el contrato anterior con Prisma regenerado', async () => {
  const nombres = readdirSync(migrations, { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.equal(nombres.at(-1), expansion);
  for (const name of nombres.slice(0, -1)) {
    try {
      migrar(name);
    } catch (error) {
      throw new Error('No se pudo reproducir la migración histórica: ' + name, { cause: error });
    }
  }
  psql(`INSERT INTO usuarios (idusuario,nombres,apellidos,correo)
    VALUES ('${usuario}', 'Persona', 'Prueba', 'metricas@example.invalid'),
           ('${segundoUsuario}', 'Segunda', 'Prueba', 'metricas2@example.invalid');`);
  await comprobarContrato(usuario);
  const historico = psql('SELECT to_jsonb(m) FROM metricas_diarias m;');
  migrar(expansion);
  assert.equal(psql("SELECT to_jsonb(m) - 'dia_local' FROM metricas_diarias m;"), historico);
  await comprobarContrato(segundoUsuario);
  assert.equal(psql('SELECT count(*) FROM metricas_diarias WHERE dia_local IS NULL;'), '2');
  assert.equal(psql("SELECT data_type || ':' || is_nullable FROM information_schema.columns " +
    "WHERE table_name = 'metricas_diarias' AND column_name = 'dia_local';"), 'date:YES');
});

test('rechaza un destino sin marca aunque se declaren modo y nombre correctos', () => {
  const antes = activas();
  assert.throws(() => archivo('sin-marca'), /42P01.*jjgym_ensayo/);
  assert.equal(activas(), antes);
  assert.equal(psql("SELECT count(*) FROM pg_namespace WHERE nspname = 'metricas_migracion';"), '0');

  psql(`CREATE SCHEMA jjgym_ensayo;
    CREATE TABLE jjgym_ensayo.destino (
      base_oid OID NOT NULL, sistema BIGINT NOT NULL, autorizacion UUID NOT NULL
    );
    INSERT INTO jjgym_ensayo.destino
    SELECT db.oid, c.system_identifier, '${autorizacionArchivo}'::uuid
    FROM pg_database db CROSS JOIN pg_control_system() c WHERE db.datname = current_database();`);
});

test('registra un lote vacío y rechaza su reutilización', () => {
  const antes = activas();
  archivo('lote-vacio');
  assert.equal(psql("SELECT count(*) FROM metricas_migracion.lotes WHERE lote = 'lote-vacio';"), '1');
  assert.equal(originales(), '');
  assert.equal(activas(), antes);
  comprobarRechazo(() => archivo('lote-vacio'), /23505.*lotes_pkey/);
});

test('diagnostica y archiva originales completos sin alterar filas de métricas', () => {
  psql(`INSERT INTO metricas_diarias (id, usuario_id, fecha, peso_actual_kg, vasos_agua, entrenamiento_completado)
  VALUES ('10000000-0000-4000-8000-000000000001','${usuario}','2001-01-02T04:59:59.999Z',NULL,0,false),
         ('10000000-0000-4000-8000-000000000002','${usuario}','2001-01-02T04:59:59.999Z',70,3,true),
         ('10000000-0000-4000-8000-000000000003','${usuario}','2001-01-02T05:00:00.000Z',70,0,false);`);
  const antes = psql('SELECT to_jsonb(m) FROM metricas_diarias m ORDER BY id;');
  const diagnostico = psql(leerScript('diagnostico.sql'));
  assert.match(diagnostico, /^5\|0/m);
  assert.match(diagnostico, /\|2001-01-01\|2\|.*\|t\|t\|t$/m);
  archivo('ensayo-expansion');
  assert.equal(psql(`SELECT count(*) FROM metricas_migracion.originales a
    JOIN metricas_diarias m ON m.id = a.original_id
    WHERE a.lote = 'ensayo-expansion' AND a.fila_original = to_jsonb(m);`), '2');
  assert.equal(psql('SELECT to_jsonb(m) FROM metricas_diarias m ORDER BY id;'), antes);
});

test('un destino o autorización incorrectos dejan intactas activas, lotes y originales', () => {
  comprobarRechazo(() => archivo('nombre-incorrecto', database + '_distinta'), /Destino no autorizado/);
  comprobarRechazo(() => archivo('marca-incorrecta', database, randomUUID()), /Destino no autorizado/);

  // Simula que la marca procedía de otra base, aunque coincidan nombre y token.
  psql('UPDATE jjgym_ensayo.destino SET base_oid = 0;');
  try {
    comprobarRechazo(() => archivo('oid-incorrecto'), /Destino no autorizado/);
  } finally {
    psql('UPDATE jjgym_ensayo.destino SET base_oid = (SELECT oid FROM pg_database WHERE datname = current_database());');
  }
});

test('rechaza reutilizar un lote con los mismos originales', () => {
  comprobarRechazo(() => archivo('ensayo-expansion'), /23505.*lotes_pkey/);
});

test('rechaza reutilizar un lote aunque ahora haya originales diferentes', () => {
  psql(`UPDATE metricas_diarias SET fecha = '2001-01-03T15:00:00Z'
    WHERE id = '10000000-0000-4000-8000-000000000002';
    INSERT INTO metricas_diarias (id, usuario_id, fecha)
    VALUES ('10000000-0000-4000-8000-000000000004','${usuario}','2001-01-04T15:00:00Z'),
           ('10000000-0000-4000-8000-000000000005','${usuario}','2001-01-04T16:00:00Z');`);
  comprobarRechazo(() => archivo('ensayo-expansion'), /23505.*lotes_pkey/);
  comprobarRechazo(() => archivo('lote-vacio'), /23505.*lotes_pkey/);
});
