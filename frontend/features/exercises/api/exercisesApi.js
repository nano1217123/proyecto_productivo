/**
 * API de la feature "exercises".
 *
 * Única puerta de entrada para datos de ejercicios.
 * Los componentes NO deben hacer fetch directamente; llaman a este módulo.
 *
 * Usa el cliente HTTP base (lib/api/httpClient.js) que centraliza:
 *   - Base URL (config/env.js).
 *   - Cookies de sesión.
 *   - Manejo de errores.
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

export const exercisesApi = {
  /**
   * Obtiene las imágenes de los ejercicios de un grupo muscular.
   *
   * @param {string} groupSlug  Slug del grupo (ej: "pecho", "espalda").
   * @returns {Promise<Record<string, string>>} Mapa { [slug]: imagen_url }.
   *
   * Antes esta transformación (array → mapa) estaba en el componente.
   * Ahora vive aquí: es lógica de datos, no de UI.
   */
  async getImagesByGroup(groupSlug) {
    const data = await http.get(`/api/ejercicios/grupo/${groupSlug}`);

    // data puede ser null si el backend devolvió 204, o no ser array si
    // devolvió algo inesperado. Defendemos contra ambos.
    if (!Array.isArray(data)) return {};

    const mapa = {};
    data.forEach((ej) => {
      if (ej && ej.slug) mapa[ej.slug] = ej.imagen_url;
    });
    return mapa;
  },

    /**
   * Obtiene el catálogo completo de ejercicios agrupado por grupo muscular.
   * @param {boolean} modoCasa - Si es true, filtra solo ejercicios para casa.
   */
  async getExerciseCatalog(modoCasa = false) {
    try {
      const url = modoCasa ? "/api/ejercicios?modo=casa" : "/api/ejercicios";
      const response = await http.get(url);
      // Dependiendo de cómo devuelva el backend, puede ser response.grupos o response.data
      return response.grupos || response.data || response; 
    } catch (err) {
      throw withMessage(err, "No se pudo cargar el catálogo de ejercicios.");
    }
  },
}; 

export default exercisesApi;
