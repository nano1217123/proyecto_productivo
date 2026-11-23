/**
 * API de la feature "routines".
 *
 * Todas las operaciones CRUD de rutinas. Usa el cliente HTTP base
 * (lib/api/httpClient.js) que centraliza URL base, cookies y errores.
 *
 * Sustituye al anterior módulo de rutinas, que mezclaba la capa HTTP
 * (un cliente `request` propio, ya redundante con httpClient) con la
 * capa de dominio. Aquí solo queda lo de dominio.
 */

import { http, HttpError } from "@/lib/api/httpClient";

/**
 * Re-lanza un error con un mensaje amigable, preservando el status y body
 * originales cuando el error provino de httpClient (HttpError).
 *
 * Motivo: los componentes muestran `err.message` al usuario. Queremos que
 * ese mensaje sea el amigable, pero que `err.status` siga disponible para
 * quien lo necesite (ej. detectar 401 y redirigir).
 */
function withMessage(err, message) {
  if (err instanceof HttpError) {
    err.message = message;
    return err;
  }
  return new HttpError(message);
}

export const routinesApi = {
  /**
   * Lista las rutinas del usuario autenticado.
   * @returns {Promise<Array>} Lista de rutinas.
   */
  async getRoutines() {
    try {
      const { rutinas } = await http.get("/api/rutinas");
      return rutinas;
    } catch (err) {
      throw withMessage(err, "No se pudieron cargar tus rutinas.");
    }
  },

  /**
   * Detalle de una rutina con sus ejercicios ordenados.
   * @param {string|number} rutinaId
   * @returns {Promise<object>}
   */
  async getRoutineDetail(rutinaId) {
    try {
      const { rutina } = await http.get(`/api/rutinas/${rutinaId}`);
      return rutina;
    } catch (err) {
      throw withMessage(err, "No se pudo cargar la rutina.");
    }
  },

  /**
   * Crea una rutina nueva.
   * @param {{ nombre: string, diaEtiqueta?: string, ejercicioIds: number[] }} input
   * @returns {Promise<object>}
   */
  async createRoutine({ nombre, diaEtiqueta, ejercicioIds }) {
    if (!nombre?.trim()) throw new HttpError("La rutina necesita un nombre.");
    if (!ejercicioIds || ejercicioIds.length === 0) {
      throw new HttpError("Agrega al menos un ejercicio a la rutina.");
    }

    try {
      return await http.post("/api/rutinas", {
        nombre: nombre.trim(),
        diaEtiqueta: diaEtiqueta?.trim() || null,
        ejercicioIds,
      });
    } catch (err) {
      // 400 = validación del backend: preservamos el mensaje del servidor.
      if (err instanceof HttpError && err.status === 400) throw err;
      throw withMessage(err, "No se pudo crear la rutina.");
    }
  },

  /**
   * Actualiza una rutina existente.
   * @param {{ rutinaId: string|number, nombre: string, diaEtiqueta?: string, ejercicioIds: number[] }} input
   * @returns {Promise<void>}
   */
  async updateRoutine({ rutinaId, nombre, diaEtiqueta, ejercicioIds }) {
    if (!nombre?.trim()) throw new HttpError("La rutina necesita un nombre.");
    if (!ejercicioIds || ejercicioIds.length === 0) {
      throw new HttpError("La rutina debe tener al menos un ejercicio.");
    }

    try {
      await http.put(`/api/rutinas/${rutinaId}`, {
        nombre: nombre.trim(),
        diaEtiqueta: diaEtiqueta?.trim() || null,
        ejercicioIds,
      });
    } catch (err) {
      // 400 / 404: preservamos el mensaje del servidor.
      if (err instanceof HttpError && (err.status === 400 || err.status === 404)) {
        throw err;
      }
      throw withMessage(err, "No se pudo actualizar la rutina.");
    }
  },

  /**
   * Elimina una rutina.
   * @param {string|number} rutinaId
   * @returns {Promise<void>}
   */
  async deleteRoutine(rutinaId) {
    try {
      await http.del(`/api/rutinas/${rutinaId}`);
    } catch (err) {
      throw withMessage(err, "No se pudo eliminar la rutina.");
    }
  },
};

export default routinesApi;
