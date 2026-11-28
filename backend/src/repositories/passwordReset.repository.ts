import { prisma } from "../lib/prisma.js";
import { usuarioTransaction } from "./usuarioTransaction.js";

// Acceso a la tabla password_reset_tokens (tokens hasheados con SHA-256).
export function createPasswordResetRepository(db: typeof prisma = prisma) {
  return {
    // Invalida los tokens anteriores y crea uno nuevo, en una transacción.
    async replaceForUser(
      usuarioId: string,
      tokenHash: string,
      expiresAt: Date
    ): Promise<void> {
      await usuarioTransaction(usuarioId, async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: { usuarioId, used: false },
          data: { used: true },
        });
        await tx.passwordResetToken.create({
          data: { usuarioId, tokenHash, expiresAt },
        });
      }, db);
    },

    // Token vigente (no usado y no expirado), o null.
    async findActive(tokenHash: string): Promise<{
      id: string;
      usuarioId: string;
      expiresAt: Date;
    } | null> {
      return db.passwordResetToken.findFirst({
        where: {
          tokenHash,
          used: false,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, usuarioId: true, expiresAt: true },
      });
    },

    async consumeAndReset(id: string, usuarioId: string, passwordHash: string): Promise<boolean> {
      return usuarioTransaction(usuarioId, async (tx) => {
        const { count } = await tx.passwordResetToken.updateMany({
          where: { id, usuarioId, used: false, expiresAt: { gt: new Date() } },
          data: { used: true },
        });
        if (count === 0) return false;

        await tx.usuario.update({ where: { idusuario: usuarioId }, data: { passwordHash } });
        await tx.refreshToken.updateMany({
          where: { usuarioId, revoked: false },
          data: { revoked: true },
        });
        return true;
      }, db);
    },
  };
}

export type PasswordResetRepository = ReturnType<
  typeof createPasswordResetRepository
>;

export const passwordResetRepository = createPasswordResetRepository();