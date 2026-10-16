import { prisma } from "../lib/prisma.js";
import { generateId } from "../lib/uuid.js";
import type { OAuthProfile } from "../types/oauth.types.js";

export function createOAuthRepository(db: typeof prisma = prisma) {
  return {
    // Busca un usuario por correo.
    async findByEmail(email: string) {
      return db.usuario.findUnique({
        where: { correo: email },
        select: {
          idusuario: true,
          correo: true,
          nombres: true,
          apellidos: true,
          tipoUsuario: true,
          emailVerified: true,
          passwordHash: true,
          provider: true,
          providerId: true,
        },
      });
    },

    // Crea un usuario nuevo desde el perfil de OAuth (sin contraseña).
    async createFromOAuth(profile: OAuthProfile): Promise<string> {
      const user = await db.usuario.create({
        data: {
          idusuario: generateId(),
          nombres: profile.nombres,
          apellidos: profile.apellidos,
          correo: profile.email,
          passwordHash: null,
          tipoUsuario: "cliente",
          emailVerified: true, // el proveedor ya verificó el correo
          provider: profile.provider,
          providerId: profile.providerId,
        },
        select: { idusuario: true },
      });
      return user.idusuario;
    },

    // Vincula un usuario existente (con password) con su cuenta de OAuth.
    async linkOAuth(usuarioId: string, profile: OAuthProfile): Promise<void> {
      await db.usuario.update({
        where: { idusuario: usuarioId },
        data: {
          provider: profile.provider,
          providerId: profile.providerId,
          emailVerified: true, // el proveedor ya verificó el correo
        },
      });
    },
  };
}

export type OAuthRepository = ReturnType<typeof createOAuthRepository>;
export const oauthRepository = createOAuthRepository();