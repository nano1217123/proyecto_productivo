import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export function usuarioTransaction<T>(
  usuarioId: string,
  work: (db: Prisma.TransactionClient) => Promise<T>,
  client: typeof prisma = prisma,
) {
  return client.$transaction(async (db) => {
    await db.$queryRaw`SELECT idusuario FROM usuarios WHERE idusuario = ${usuarioId}::uuid FOR UPDATE`;
    return work(db);
  });
}
