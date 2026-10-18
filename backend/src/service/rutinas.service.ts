import { AppError } from "../errors/AppError.js";
import { generateId } from "../lib/uuid.js";
import {
  rutinasRepository,
  type RutinasRepository,
} from "../repositories/rutinas.repository.js";
import type {
  CreateRutinaInput,
  RutinaDetalle,
  RutinaResumen,
  UpdateRutinaInput,
} from "../types/rutinas.types.js";

/**
 * Construye el servicio de rutinas.
 *
 * Recibe el repositorio como dependencia para facilitar las pruebas.
 * Los datos de entrada ya llegan validados y limpios desde el validator.
 */
export function createRutinasService(
  repository: RutinasRepository = rutinasRepository
) {
  return {
    // Lista las rutinas del usuario autenticado.
    async list(usuarioId: string): Promise<RutinaResumen[]> {
      return repository.findAllByUsuario(usuarioId);
    },

    // Devuelve el detalle de una rutina o lanza 404.
    async getById(
      rutinaId: string,
      usuarioId: string
    ): Promise<RutinaDetalle> {
      const rutina = await repository.findByIdForUsuario(rutinaId, usuarioId);

      if (!rutina) {
        throw new AppError(404, "Rutina no encontrada.");
      }

      return rutina;
    },

    // Crea una rutina nueva.
    async create(
      usuarioId: string,
      input: CreateRutinaInput
    ): Promise<{ id: string }> {
      const id = await repository.create(usuarioId, input, generateId);
      return { id };
    },

    // Actualiza una rutina existente.
    async update(
      usuarioId: string,
      input: UpdateRutinaInput
    ): Promise<void> {
      await repository.update(usuarioId, input);
    },

    // Borra una rutina existente.
    async delete(rutinaId: string, usuarioId: string): Promise<void> {
      await repository.delete(rutinaId, usuarioId);
    },
  };
}

export type RutinasService = ReturnType<typeof createRutinasService>;

export const rutinasService = createRutinasService();