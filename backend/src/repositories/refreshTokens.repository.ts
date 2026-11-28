import { prisma } from "../lib/prisma.js";
import { usuarioTransaction } from "./usuarioTransaction.js";

export interface RefreshTokenRow {
  id: string;
  usuarioId: string;
  expiresAt: Date;
  revoked: boolean;
}

export function createRefreshTokensRepository(db: typeof prisma = prisma) {
  return {
    async create(
      usuarioId: string,
      tokenHash: string,
      expiresAt: Date
    ): Promise<void> {
      await db.refreshToken.create({
        data: { usuarioId, tokenHash, expiresAt },
      });
    },

    async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
      return db.refreshToken.findUnique({
        where: { tokenHash },
        select: { id: true, usuarioId: true, expiresAt: true, revoked: true },
      });
    },

    async revoke(id: string): Promise<void> {
      await db.refreshToken.update({ where: { id }, data: { revoked: true } });
    },

    // Se usa ante reutilización de un token ya revocado (posible robo).
    async revokeAllForUser(usuarioId: string): Promise<void> {
      await usuarioTransaction(usuarioId, (tx) => tx.refreshToken.updateMany({
        where: { usuarioId, revoked: false },
        data: { revoked: true },
      }), db);
    },

    // Revoca el token usado y crea el nuevo, de forma atómica.
    async rotate(
      oldId: string,
      usuarioId: string,
      newHash: string,
      expiresAt: Date
    ): Promise<boolean> {
      return usuarioTransaction(usuarioId, async (tx) => {
        const { count } = await tx.refreshToken.updateMany({
          where: { id: oldId, usuarioId, revoked: false, expiresAt: { gt: new Date() } },
          data: { revoked: true },
        });
        if (count === 0) return false;

        await tx.refreshToken.create({
          data: { usuarioId, tokenHash: newHash, expiresAt },
        });
        return true;
      }, db);
    },
  };
}

export type RefreshTokensRepository = ReturnType<
  typeof createRefreshTokensRepository
>;

export const refreshTokensRepository = createRefreshTokensRepository();