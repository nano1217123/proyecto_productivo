import { AppError } from "../errors/AppError.js";
import { generateRefreshToken, hashRefreshToken, refreshExpiresAt, signAccessToken } from "../lib/tokens.js";
import {
  oauthRepository,
  type OAuthRepository,
} from "../repositories/oauth.repository.js";
import {
  refreshTokensRepository,
  type RefreshTokensRepository,
} from "../repositories/refreshTokens.repository.js";
import type { OAuthProfile } from "../types/oauth.types.js";

export interface OAuthLoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    idusuario: string;
    nombres: string;
    apellidos: string;
    tipoUsuario: string;
  };
}

export function createOAuthService(
  repo: OAuthRepository = oauthRepository,
  sessions: RefreshTokensRepository = refreshTokensRepository
) {
  return {
    // Procesa el login con un perfil OAuth ya validado:
    //   - Si el correo no existe: crea un usuario nuevo.
    //   - Si existe con password: vincula la cuenta al proveedor.
    //   - Si existe con el mismo provider: solo inicia sesión.
    // Devuelve tokens para setear cookies.
    async loginWithProfile(profile: OAuthProfile): Promise<OAuthLoginResult> {
      const existente = await repo.findByEmail(profile.email);

      let usuarioId: string;
      let nombres: string;
      let apellidos: string;
      let tipoUsuario: string;

      if (!existente) {
        // Caso 1: usuario nuevo → crear.
        usuarioId = await repo.createFromOAuth(profile);
        nombres = profile.nombres;
        apellidos = profile.apellidos;
        tipoUsuario = "cliente";
      } else {
        // Caso 2: usuario existente.
        usuarioId = existente.idusuario;
        nombres = existente.nombres;
        apellidos = existente.apellidos;
        tipoUsuario = existente.tipoUsuario;

        // Si tenía password y aún no está vinculado al proveedor, vincular.
        if (
          existente.passwordHash &&
          existente.provider !== profile.provider
        ) {
          await repo.linkOAuth(usuarioId, profile);
        }
        // Si ya estaba vinculado con el mismo provider, no hacemos nada.
      }

      // Crear sesión (mismo mecanismo que el login normal).
      const refreshToken = generateRefreshToken();
      await sessions.create(
        usuarioId,
        hashRefreshToken(refreshToken),
        refreshExpiresAt()
      );

          return {
      accessToken: signAccessToken({
        sub: usuarioId,
        email: profile.email,
        role: tipoUsuario, // 👈 Agrega esta línea
      }),
        refreshToken,
        user: { idusuario: usuarioId, nombres, apellidos, tipoUsuario },
      };
    },
  };
}

export type OAuthService = ReturnType<typeof createOAuthService>;
export const oauthService = createOAuthService();