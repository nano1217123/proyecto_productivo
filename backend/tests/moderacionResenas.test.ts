import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mock, test } from "node:test";
import type { PrismaClient } from "../src/generated/prisma/client.js";

mock.module(new URL("../src/lib/prisma.ts", import.meta.url).href, { namedExports: { prisma: {} } });
const { createModeracionResenasRepository } = await import("../src/repositories/moderacionResenas.repository.js");

const dia = 86_400_000;
const inicio = Date.UTC(2026, 0, 1);
type Privado = { denunciaId: string; resenaId: string; denuncianteId: string; descripcion?: string; vencerEn: Date };
type Caso = {
  id: string; estado: string; prioritaria: boolean; revision: number; motivo: string; gymSlug: string;
  resenaId: string | null; revisarEn: Date; resueltoEn?: Date; eliminarEn?: Date; creadoEn: Date;
};
type Evento = { denunciaId?: string; motivo: string; accion: string; eliminarEn?: Date | null; actorId?: string };
type Filtros = {
  id?: string;
  gymSlug?: string; estado?: string | { not: string }; eliminarEn?: { gt?: Date; lte?: Date };
  prioritaria?: boolean; revisarEn?: { lte: Date }; denunciaId?: string | null | { in: string[] };
  vencerEn?: { gt?: Date; lte?: Date };
};

function preparar() {
  let ahora = inicio;
  const resena = { id: "resena", gymSlug: "jj-poblado", revision: 1, visibilidad: "VISIBLE", comentario: "Crítica legítima", calificacion: 1 };
  const roles = new Map([["cliente", "cliente"], ["particular", "usuario_particular"], ["admin", "admin"],
    ["otro-admin", "admin"], ["super", "super_admin"]]);
  const membresias = new Map([["cliente", resena.gymSlug]]);
  const casos: Caso[] = [];
  const privados: Privado[] = [];
  const eventos: Evento[] = [];
  const consultaSql: string[] = [];
  const remover = <T>(filas: T[], aplica: (fila: T) => boolean) => {
    const inicial = filas.length;
    for (let indice = filas.length - 1; indice >= 0; indice--) if (aplica(filas[indice])) filas.splice(indice, 1);
    return { count: inicial - filas.length };
  };
  const compara = (valor?: Date, filtro?: { gt?: Date; lte?: Date }) =>
    !filtro || Boolean(valor && (!filtro.gt || valor > filtro.gt) && (!filtro.lte || valor <= filtro.lte));
  const cumple = (caso: Caso, where: Filtros) =>
    (!where.id || where.id === caso.id) && (!where.gymSlug || where.gymSlug === caso.gymSlug) &&
    (!where.estado || (typeof where.estado === "string" ? caso.estado === where.estado : caso.estado !== where.estado.not)) &&
    (where.prioritaria === undefined || where.prioritaria === caso.prioritaria) &&
    compara(caso.revisarEn, where.revisarEn) && compara(caso.eliminarEn, where.eliminarEn);
  const tx = {
    async $queryRaw(template: TemplateStringsArray, id: string, sede: string) {
      const consulta = template.join("?");
      consultaSql.push(consulta);
      if (consulta.includes("pg_try_advisory")) return [{ adquirido: true }];
      if (consulta.includes("pg_advisory")) return [];
      if (consulta.includes("FROM usuarios")) return [{ rol: roles.get(id) }];
      if (consulta.includes("FROM admin_sedes")) return id === "admin" && sede === resena.gymSlug ? [{ id }] : [];
      if (consulta.includes("FROM miembros_sede")) return membresias.get(id) === sede ? [{ id }] : [];
      if (consulta.includes("FROM denuncias_resenas")) return casos.filter(caso => caso.id === id);
      if (consulta.includes("FROM resenas")) {
        return id === resena.id && (!consulta.includes("visibilidad = 'VISIBLE'") || resena.visibilidad === "VISIBLE") ? [{ ...resena }] : [];
      }
      throw new Error("Consulta inesperada");
    },
    resena: {
      update: async ({ data }: { data: { visibilidad: string; revision: { increment: number } } }) => {
        resena.visibilidad = data.visibilidad;
        resena.revision += data.revision.increment;
      },
    },
    denunciaResena: {
      create: async ({ data }: { data: Omit<Caso, "id" | "estado" | "prioritaria"> & { datosPrivados: { create: Omit<Privado, "denunciaId"> } } }) => {
        const { datosPrivados, ...resto } = data;
        const id = `caso-${casos.length + 1}`;
        casos.push({ ...resto, id, estado: "PENDIENTE", prioritaria: false });
        privados.push({ ...datosPrivados.create, denunciaId: id });
        return { id };
      },
      findUnique: async ({ where }: { where: { id: string } }) => casos.find(caso => caso.id === where.id),
      findMany: async ({ where, select }: { where: Filtros; select: { resena: { select: { comentario?: boolean } } } }) =>
        casos.filter(caso => cumple(caso, where)).map(caso => ({ ...caso,
          resena: caso.resenaId === null ? null
            : select.resena.select.comentario ? resena : { id: resena.id, revision: resena.revision, visibilidad: resena.visibilidad },
        })),
      update: async ({ where, data }: { where: { id: string }; data: Partial<Caso> }) =>
        Object.assign(casos.find(caso => caso.id === where.id)!, data),
      updateMany: async ({ where, data }: { where: Filtros; data: Partial<Caso> }) => {
        const objetivo = casos.filter(caso => cumple(caso, where));
        objetivo.forEach(caso => Object.assign(caso, data));
        return { count: objetivo.length };
      },
      deleteMany: async ({ where }: { where: Filtros }) => {
        const ids = new Set(casos.filter(caso => cumple(caso, where)).map(caso => caso.id));
        remover(eventos, evento => Boolean(evento.denunciaId && ids.has(evento.denunciaId)));
        return remover(casos, caso => ids.has(caso.id));
      },
    },
    denunciaResenaPrivada: {
      findUnique: async ({ where }: { where: { resenaId_denuncianteId: Pick<Privado, "resenaId" | "denuncianteId"> } }) => {
        const { resenaId, denuncianteId } = where.resenaId_denuncianteId;
        return privados.find(fila => fila.resenaId === resenaId && fila.denuncianteId === denuncianteId);
      },
      findMany: async ({ where, select }: { where: Filtros; select: Record<string, boolean> }) => {
        assert.deepEqual(select, { denunciaId: true, descripcion: true });
        const ids = where.denunciaId;
        return privados.filter(fila => typeof ids === "object" && ids?.in.includes(fila.denunciaId) &&
          compara(fila.vencerEn, where.vencerEn)).map(({ denunciaId, descripcion }) => ({ denunciaId, descripcion }));
      },
      deleteMany: async ({ where }: { where: Filtros }) => remover(privados, fila =>
        (!where.denunciaId || fila.denunciaId === where.denunciaId) && compara(fila.vencerEn, where.vencerEn)),
    },
    decisionModeracionResena: {
      create: async ({ data }: { data: Evento }) => { eventos.push(data); },
      deleteMany: async ({ where }: { where: Filtros }) => remover(eventos, fila =>
        !fila.denunciaId && compara(fila.eliminarEn ?? undefined, where.eliminarEn)),
    },
  };
  // Esta cola modela la serialización. Las pruebas comprueban también las cláusulas que deberá ejecutar PostgreSQL.
  let operaciones = Promise.resolve<unknown>(undefined);
  const db = { $transaction: (accion: (cliente: typeof tx) => Promise<unknown>) => {
    const resultado = operaciones.then(() => accion(tx));
    operaciones = resultado.catch(() => {});
    return resultado;
  } };
  const repo = createModeracionResenasRepository(db as unknown as PrismaClient, () => new Date(ahora));
  return {
    repo, casos, privados, eventos, resena, membresias, consultaSql,
    avanzar: (d: number) => { ahora = inicio + d * dia; },
    borrarCuenta: (id: string) => remover(privados, fila => fila.denuncianteId === id),
    borrarResena: (id: string) => {
      remover(privados, fila => fila.resenaId === id);
      for (const caso of casos) if (caso.resenaId === id) caso.resenaId = null;
    },
  };
}

test("la denuncia deduplicada no oculta, y los administradores no ven el detalle ni la identidad", async () => {
  const f = preparar();
  const resultados = await Promise.all([
    f.repo.denunciar("cliente", f.resena.id, "ACOSO", "Dato privado"),
    f.repo.denunciar("cliente", f.resena.id, "SPAM"),
  ]);
  assert.deepEqual(resultados[0], resultados[1]);
  assert.equal(f.casos.length, 1);
  assert.equal(f.resena.visibilidad, "VISIBLE");
  assert.ok(f.consultaSql.some(sql => sql.includes("pg_advisory_xact_lock")));
  const admin = await f.repo.listar("admin", f.resena.gymSlug, 1, false);
  assert.doesNotMatch(JSON.stringify(admin), /Dato privado|denuncianteId|Crítica legítima/);
  const superAdmin = await f.repo.listar("super", undefined, 1, false);
  assert.match(JSON.stringify(superAdmin), /Dato privado/);
  assert.doesNotMatch(JSON.stringify(superAdmin), /denuncianteId/);
  await assert.rejects(f.repo.listar("otro-admin", f.resena.gymSlug, 1, false), { statusCode: 403 });
  f.membresias.clear();
  await assert.rejects(f.repo.denunciar("cliente", f.resena.id, "ACOSO"), { statusCode: 404 });
  await assert.rejects(f.repo.denunciar("admin", f.resena.id, "ACOSO"), { statusCode: 403 });
});

test("derivar, ocultar y restaurar respetan permisos y revisión sin conservar el detalle tras resolver", async () => {
  const f = preparar();
  const caso = await f.repo.denunciar("particular", f.resena.id, "DATOS_PERSONALES", "Temporal");
  const ocultar = { accion: "OCULTAR", motivo: "DATOS_PERSONALES", revision: 1 } as const;
  await assert.rejects(f.repo.decidir("admin", { denunciaId: caso.id }, ocultar), { statusCode: 403 });
  await f.repo.decidir("admin", { denunciaId: caso.id }, { accion: "DERIVAR", motivo: "REQUIERE_REVISION", revision: null });
  assert.equal(f.resena.visibilidad, "VISIBLE");
  assert.equal(f.casos[0].estado, "DERIVADA");
  f.resena.revision++;
  await assert.rejects(f.repo.decidir("super", { denunciaId: caso.id }, ocultar), { statusCode: 409 });
  const decisiones = await Promise.allSettled([
    f.repo.decidir("super", { denunciaId: caso.id }, { ...ocultar, revision: 2 }),
    f.repo.decidir("super", { denunciaId: caso.id }, { ...ocultar, revision: 2 }),
  ]);
  assert.deepEqual(decisiones.map(decision => decision.status), ["fulfilled", "rejected"]);
  assert.ok(f.consultaSql.some(sql => sql.includes("FROM denuncias_resenas") && sql.includes("FOR UPDATE")));
  assert.equal(f.privados.length, 0);
  assert.equal(f.resena.visibilidad, "OCULTA");
  assert.equal(f.resena.calificacion, 1);
  assert.doesNotMatch(JSON.stringify(f.eventos), /Temporal|denuncianteId|Crítica legítima/);
  await f.repo.decidir("super", { resenaId: f.resena.id }, {
    accion: "RESTAURAR", motivo: "SIN_INFRACCION", revision: f.resena.revision,
  });
  assert.equal(f.resena.visibilidad, "VISIBLE");
  assert.equal(f.eventos.at(-1)?.actorId, "super");
});

test("los plazos se cumplen en la lectura y la depuración es idempotente y conserva el estado abierto", async () => {
  const f = preparar();
  const abierto = await f.repo.denunciar("cliente", f.resena.id, "SPAM", "Debe desaparecer");
  const cerrado = await f.repo.denunciar("particular", f.resena.id, "OTRO", "También privado");
  f.avanzar(1);
  await f.repo.decidir("super", { denunciaId: cerrado.id }, { accion: "RESOLVER", motivo: "SIN_INFRACCION", revision: 1 });
  assert.equal(f.privados.length, 1);
  f.avanzar(29.99);
  assert.deepEqual(await f.repo.depurar("super"), { ejecutada: true, prioritarias: 0, datosPrivados: 0, casos: 0, decisiones: 0 });
  f.avanzar(30);
  const antes = await f.repo.listar("super", undefined, 1, false);
  assert.equal(antes.casos[0].prioritaria, true);
  assert.doesNotMatch(JSON.stringify(antes), /Debe desaparecer/);
  await assert.rejects(f.repo.depurar("admin"), { statusCode: 403 });
  assert.deepEqual(await f.repo.depurar("super"), { ejecutada: true, prioritarias: 1, datosPrivados: 1, casos: 0, decisiones: 0 });
  assert.deepEqual(await f.repo.depurar(), { ejecutada: true, prioritarias: 0, datosPrivados: 0, casos: 0, decisiones: 0 });
  assert.equal(f.casos.find(c => c.id === abierto.id)?.estado, "PENDIENTE");
  assert.equal(f.resena.visibilidad, "VISIBLE");
  f.avanzar(180.99);
  assert.equal((await f.repo.depurar()).casos, 0);
  f.avanzar(181);
  assert.equal((await f.repo.listar("super", undefined, 1, true)).casos.length, 0);
  assert.equal((await f.repo.depurar()).casos, 1);
  assert.equal(f.eventos.length, 0);
  assert.deepEqual(f.casos.map(caso => caso.id), [abierto.id]);
});

test("la migración deja el historial mínimo y ordena borrar datos privados al borrar una cuenta o reseña", () => {
  const sql = readFileSync(new URL("../prisma/migrations/20261129130000_moderacion_resenas/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /denuncias_resenas_privadas_resena_id_fkey.*REFERENCES "resenas"\("id"\) ON DELETE CASCADE/);
  assert.match(sql, /denuncias_resenas_privadas_denunciante_id_fkey.*REFERENCES "usuarios"\("idusuario"\) ON DELETE CASCADE/);
  assert.match(sql, /denuncias_resenas_resena_id_fkey.*REFERENCES "resenas"\("id"\) ON DELETE SET NULL/);
  assert.match(sql, /decisiones_moderacion_resenas_actor_id_fkey.*ON DELETE SET NULL/);
  assert.match(sql, /CREATE UNIQUE INDEX.*"denuncias_resenas_privadas"\("resena_id",\s*"denunciante_id"\)/);
  assert.doesNotMatch(sql, /(?:DROP TABLE|DROP COLUMN)/);
});

test("la proyección tras las cascadas conserva el caso y omite los datos privados que ya no existen", async () => {
  const f = preparar();
  const primero = await f.repo.denunciar("cliente", f.resena.id, "SPAM", "Detalle que sale con la cuenta");
  await f.repo.denunciar("particular", f.resena.id, "ACOSO", "Detalle que sale con la reseña");
  f.borrarCuenta("cliente");
  let cola = await f.repo.listar("super", undefined, 1, false);
  assert.equal(cola.casos.length, 2);
  assert.doesNotMatch(JSON.stringify(cola), /sale con la cuenta/);
  f.borrarResena(f.resena.id);
  cola = await f.repo.listar("super", undefined, 1, false);
  assert.equal(cola.casos.length, 2);
  assert.equal(cola.casos.find(caso => caso.id === primero.id)?.resena, null);
  assert.doesNotMatch(JSON.stringify(cola), /sale con la reseña|denuncianteId/);
});

test("un envío tras los 30 días depura la identidad vencida antes de crear un nuevo caso", async () => {
  const f = preparar();
  const antigua = await f.repo.denunciar("cliente", f.resena.id, "SPAM", "Vencida");
  f.avanzar(30);
  const nueva = await f.repo.denunciar("cliente", f.resena.id, "SPAM");
  assert.notEqual(nueva.id, antigua.id);
  assert.equal(f.casos[0].prioritaria, true);
  assert.equal(f.casos[0].estado, "PENDIENTE");
  assert.equal(f.privados[0].denunciaId, nueva.id);
  assert.equal(f.privados.length, 1);
});
