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

import { http } from "@/lib/api/httpClient";

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
};

export default exercisesApi;
