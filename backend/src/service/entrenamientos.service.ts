import { AppError } from "../errors/AppError.js";
import { generateId } from "../lib/uuid.js";
import {
  entrenamientosRepository,
  type EntrenamientosRepository,
} from "../repositories/entrenamientos.repository.js";
import type {
  CreateEntrenamientoInput,
  EntrenamientoResumen,
  ProgresoPunto,
} from "../types/entrenamientos.types.js";

export function createEntrenamientosService(
  repository: EntrenamientosRepository = entrenamientosRepository
) {
  return {
    async list(usuarioId: string): Promise<EntrenamientoResumen[]> {
      return repository.findAllByUsuario(usuarioId);
    },

    async create(
      usuarioId: string,
      input: CreateEntrenamientoInput
    ): Promise<{ id: string }> {
      const id = await repository.create(usuarioId, input, generateId);
      return { id };
    },

    async getProgreso(
      usuarioId: string,
      ejercicioId: number
    ): Promise<ProgresoPunto[]> {
      if (!Number.isInteger(ejercicioId) || ejercicioId <= 0) {
        throw new AppError(400, "ID de ejercicio inválido.");
      }
      return repository.getProgresoByEjercicio(usuarioId, ejercicioId);
    },

    async delete(entrenamientoId: string, usuarioId: string): Promise<void> {
      await repository.delete(entrenamientoId, usuarioId);
    },
  };
}

export type EntrenamientosService = ReturnType<typeof createEntrenamientosService>;
export const entrenamientosService = createEntrenamientosService();