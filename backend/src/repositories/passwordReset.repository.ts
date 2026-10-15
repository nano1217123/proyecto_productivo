import { prisma } from "../lib/prisma.js";

const SELECT = {
  id: true,
  usuarioId: true,
  tokenHash: true,
  expiresAt: true,
  used: true,
  creadoEn: true,
} as const;

// Acceso a la tabla password_reset_tokens (tokens hasheados con SHA-256).
export function createPasswordResetRepository(db: typeof prisma = prisma) {
  return {
    // Invalida los tokens anteriores y crea uno nuevo, en una transacción.
    async replaceForUser(
      usuarioId: string,
      tokenHash: string,
      expiresAt: Date
    ): Promise<void> {
      await db.$transaction([
        db.passwordResetToken.updateMany({
          where: { usuarioId, used: false },
          data: { used: true },
        }),
        db.passwordResetToken.create({
          data: { usuarioId, tokenHash, expiresAt },
        }),
      ]);
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

    async markUsed(id: string): Promise<void> {
      await db.passwordResetToken.update({
        where: { id },
        data: { used: true },
      });
    },

    // Revoca todos los tokens pendientes de un usuario.
    async revokeAllForUser(usuarioId: string): Promise<void> {
      await db.passwordResetToken.updateMany({
        where: { usuarioId, used: false },
        data: { used: true },
      });
    },
  };
}

export type PasswordResetRepository = ReturnType<
  typeof createPasswordResetRepository
>;

export const passwordResetRepository = createPasswordResetRepository();