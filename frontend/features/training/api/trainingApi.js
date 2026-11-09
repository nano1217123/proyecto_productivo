/**
 * API de la feature "training".
 *
 * Operaciones sobre entrenamientos (sesiones y series). Usa el cliente HTTP
 * base (lib/api/httpClient.js) que centraliza URL base, cookies y errores.
 *
 * Reemplaza al antiguo lib/training.js, que mezclaba:
 *   - Un cliente `request` propio (ya redundante con httpClient).
 *   - getExerciseCatalog() (movido a exercisesApi.js — su dominio real).
 *   - Las operaciones de entrenamientos (que viven aquí).
 */

import { http, HttpError } from "@/lib/api/httpClient";

/**
 * Re-lanza un error con un mensaje amigable, preservando el status y body
 * originales cuando el error provino de httpClient (HttpError).
 */
function withMessage(err, message) {
  if (err instanceof HttpError) {
    err.message = message;
    return err;
  }
  return new HttpError(message);
}

export const trainingApi = {
  /**
   * Guarda una sesión completa: entrenamiento + series.
   *
   * @param {{
   *   fecha: string,
   *   notas?: string,
   *   series: Array<{ ejercicio_id: number, numero_serie: number, repeticiones: number, peso_kg: number|null }>
   * }} input
   * @returns {Promise<object>}
   */
  async saveTrainingSession({ fecha, notas, series }) {
    if (!series || series.length === 0) {
      throw new HttpError("Agrega al menos una serie antes de guardar.");
    }

    try {
      return await http.post("/api/entrenamientos", {
        fecha,
        notas: notas || null,
        series,
      });
    } catch (err) {
      // 400 = validación del backend: preservamos el mensaje del servidor.
      if (err instanceof HttpError && err.status === 400) throw err;
      throw withMessage(err, "No se pudo guardar el entrenamiento.");
    }
  },

  /**
   * Trae el historial completo del usuario con sus series y nombre de ejercicio.
   *
   * Importante: adapta la estructura del backend (ejercicio_nombre plano) al
   * formato que espera la UI (ejercicios.nombre anidado, herencia del shape
   * que devolvía Supabase). Esta transformación debe preservarse tal cual
   * para no romper los componentes que la consumen.
   *
   * @returns {Promise<Array>}
   */
  async getTrainingHistory() {
    try {
      const { entrenamientos } = await http.get("/api/entrenamientos");

      return entrenamientos.map((e) => ({
        id: e.id,
        fecha: e.fecha,
        notas: e.notas,
        series_entrenamiento: e.series.map((s) => ({
          id: s.id,
          ejercicio_id: s.ejercicio_id,
          numero_serie: s.numero_serie,
          repeticiones: s.repeticiones,
          peso_kg: s.peso_kg,
          ejercicios: { nombre: s.ejercicio_nombre },
        })),
      }));
    } catch (err) {
      throw withMessage(err, "No se pudo cargar el historial de entrenamientos.");
    }
  },

  /**
   * Progreso de un ejercicio: [{ fecha, peso_max }].
   *
   * @param {number|string} ejercicioId
   * @returns {Promise<Array<{ fecha: string, peso_max: number }>>}
   */
  async getExerciseHistory(ejercicioId) {
    try {
      const { progreso } = await http.get(
        `/api/entrenamientos/ejercicio/${ejercicioId}/progreso`
      );
      return progreso;
    } catch (err) {
      throw withMessage(err, "No se pudo cargar el historial de este ejercicio.");
    }
  },

  /**
   * Elimina un entrenamiento por su id.
   *
   * @param {number|string} entrenamientoId
   * @returns {Promise<void>}
   */
  async deleteTrainingSession(entrenamientoId) {
    try {
      await http.del(`/api/entrenamientos/${entrenamientoId}`);
    } catch (err) {
      throw withMessage(err, "No se pudo eliminar el entrenamiento.");
    }
  },
};

export default trainingApi;
