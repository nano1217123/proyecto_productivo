import { usuarioTransaction } from "../repositories/usuarioTransaction.js";
import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

export const nutritionDb = {
  profiles: prisma.nutricionPerfil,
  references: prisma.nutricionReferencia,
  entries: prisma.nutricionRegistro,
  favorites: prisma.nutricionFavorito,
  latestWeight(usuarioId: string, db: Prisma.TransactionClient = prisma) {
    return db.metricaDiaria.findFirst({
      where: { usuarioId, pesoActualKg: { not: null } },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      select: { pesoActualKg: true },
    });
  },
  transaction: usuarioTransaction,
};
