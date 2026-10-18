import { prisma } from "../lib/prisma.js";

export interface CodigoActivo {
  id: string;
  codeHash: string;
  expiresAt: Date;
  intentos: number;
  creadoEn: Date;
}

const SELECT = {
  id: true,
  codeHash: true,
  expiresAt: true,
  intentos: true,
  creadoEn: true,
} as const;

// Acceso a la tabla verification_codes (códigos OTP hasheados).
export function createVerificationCodesRepository(db: typeof prisma = prisma) {
  return {
    // Invalida los códigos anteriores y crea uno nuevo, en una transacción.
    async replaceForUser(
      usuarioId: string,
      codeHash: string,
      expiresAt: Date
    ): Promise<void> {
      await db.$transaction([
        db.verificationCode.updateMany({
          where: { usuarioId, used: false },
          data: { used: true },
        }),
        db.verificationCode.create({
          data: { usuarioId, codeHash, expiresAt },
        }),
      ]);
    },

    // Código vigente (no usado) más reciente, o null.
    async findActive(usuarioId: string): Promise<CodigoActivo | null> {
      return db.verificationCode.findFirst({
        where: { usuarioId, used: false },
        orderBy: { creadoEn: "desc" },
        select: SELECT,
      });
    },

    // Último código emitido (usado o no), para el cooldown del reenvío.
    async findLatest(usuarioId: string): Promise<CodigoActivo | null> {
      return db.verificationCode.findFirst({
        where: { usuarioId },
        orderBy: { creadoEn: "desc" },
        select: SELECT,
      });
    },

    async incrementAttempts(id: string): Promise<void> {
      await db.verificationCode.update({
        where: { id },
        data: { intentos: { increment: 1 } },
      });
    },

    async markUsed(id: string): Promise<void> {
      await db.verificationCode.update({
        where: { id },
        data: { used: true },
      });
    },
  };
}

export type VerificationCodesRepository = ReturnType<
  typeof createVerificationCodesRepository
>;

export const verificationCodesRepository =
  createVerificationCodesRepository();