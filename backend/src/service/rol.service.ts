import { AppError } from "../errors/AppError.js";
import {
  usuariosRepository,
  type UsuariosRepository,
} from "../repositories/usuarios.repository.js";
import type { TipoUsuario } from "../types/usuario.types.js";

export function createRolService(repo: UsuariosRepository = usuariosRepository) {
  return {
    // Devuelve el rol del usuario autenticado.
    // Lanza 404 si el usuario ya no existe (puede pasar si se borró su cuenta
    // después de emitir el JWT).
    async getRole(userId: string): Promise<TipoUsuario> {
      const rol = await repo.findRoleById(userId);

      if (!rol) {
        throw new AppError(404, "Usuario no encontrado.");
      }

      return rol;
    },
  };
}

export type RolService = ReturnType<typeof createRolService>;
export const rolService = createRolService();