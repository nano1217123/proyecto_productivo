import { AppError } from "../errors/AppError.js";
import {
  usuariosRepository,
  type UsuariosRepository,
} from "../repositories/usuarios.repository.js";
import type { PerfilUsuario } from "../types/usuario.types.js";

/**
 * Construye el servicio de perfiles.
 *
 * Recibe el repositorio como dependencia para facilitar las pruebas.
 * Si no se proporciona uno, utiliza el repositorio real.
 */
export function createPerfilService(
  repository: UsuariosRepository = usuariosRepository
) {
  return {
    /**
     * Busca el perfil asociado al identificador del usuario.
     *
     * @param idUsuario Identificador del usuario autenticado.
     * @returns El perfil encontrado.
     * @throws AppError si el perfil no existe o no se pudo obtener.
     */
    async getProfileById(idUsuario: string): Promise<PerfilUsuario> {
      const perfil = await repository.findProfileById(idUsuario);

      if (!perfil) {
        throw new AppError(404, "Perfil no encontrado.");
      }

      return perfil;
    },
  };
}

/**
 * Instancia del servicio que utilizará la aplicación.
 */
export const perfilService = createPerfilService();