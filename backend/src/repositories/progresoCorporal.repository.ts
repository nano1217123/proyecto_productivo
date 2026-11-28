import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";
import { usuarioTransaction } from "./usuarioTransaction.js";

const camposPeso = { id: true, fecha: true, pesoActualKg: true, pesoActualizadoEn: true } as const;
const ordenDesc = [{ fecha: "desc" }, { id: "desc" }] as const;

export async function consultarPeso(usuarioId: string, desde: string | undefined, pagina: number, asc: boolean, incluirGrafica: boolean) {
  const base = { usuarioId, pesoActualKg: { not: null } };
  const where = { ...base, fecha: desde ? { gte: new Date(`${desde}T00:00:00-05:00`) } : undefined };
  const orden = asc ? [{ fecha: "asc" as const }, { id: "asc" as const }] : [...ordenDesc];
  const [ultimo, registros, resumen, puntos] = await Promise.all([
    prisma.metricaDiaria.findFirst({ where: base, orderBy: [...ordenDesc], select: camposPeso }),
    prisma.metricaDiaria.findMany({ where, orderBy: orden, skip: (pagina - 1) * 15, take: 15, select: camposPeso }),
    prisma.metricaDiaria.aggregate({ where, _count: true, ...(incluirGrafica ? { _avg: { pesoActualKg: true } } : {}) }),
    incluirGrafica ? prisma.metricaDiaria.findMany({ where, orderBy: [...ordenDesc], take: 2000, select: camposPeso }) : null,
  ]);
  return { ultimo, registros, total: resumen._count, promedio: resumen._avg?.pesoActualKg ?? null, puntos: puntos?.reverse() };
}

export function registrarPeso(usuarioId: string, id: string, pesoActualKg: number) {
  return usuarioTransaction(usuarioId, async (tx) => {
    const existente = await tx.metricaDiaria.findUnique({ where: { id }, select: { usuarioId: true } });
    if (existente) {
      if (existente.usuarioId !== usuarioId) throw new AppError(409, "No se pudo registrar el peso.");
      return;
    }
    await tx.metricaDiaria.create({ data: { id, usuarioId, pesoActualKg } });
  });
}

export async function modificarPeso(usuarioId: string, id: string, pesoActualKg: number | null) {
  await usuarioTransaction(usuarioId, async (tx) => {
    const registro = await tx.metricaDiaria.findFirst({
      where: { usuarioId, id }, select: { pesoActualKg: true, pesoActualizadoEn: true },
    });
    if (!registro || (registro.pesoActualKg === null && (pesoActualKg !== null || !registro.pesoActualizadoEn))) {
      throw new AppError(404, "Registro de peso no encontrado.");
    }
    if (registro.pesoActualKg === pesoActualKg) return;
    await tx.metricaDiaria.updateMany({
      where: { usuarioId, id },
      data: { pesoActualKg, pesoActualizadoEn: new Date() },
    });
  });
}

export function consultarAltura(usuarioId: string) {
  return prisma.usuario.findUniqueOrThrow({ where: { idusuario: usuarioId }, select: { alturaCm: true } });
}

export function guardarAltura(usuarioId: string, alturaCm: number) {
  return prisma.usuario.update({ where: { idusuario: usuarioId }, data: { alturaCm }, select: { alturaCm: true } });
}
