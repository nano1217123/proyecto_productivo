
import { http, HttpError } from "@/src/lib/api/httpClient";

function withMessage(err, message) {
  if (err instanceof HttpError) {
    return err;
  }

  return new HttpError(message);
}

export const reviewsApi = {
  // Consulta las reseñas positivas de un gimnasio.
  async getPublicReviews(gymSlug) {
    if (!gymSlug) {
      throw new HttpError("Debes seleccionar un gimnasio.");
    }

    try {
      const { resenas } = await http.get(
        `/api/resenas/gimnasio/${encodeURIComponent(gymSlug)}`
      );

      return resenas;
    } catch (err) {
      throw withMessage(err, "No se pudieron cargar las reseñas.");
    }
  },

  // Publica una reseña del cliente autenticado.
  async createReview({ gymSlug, calificacion, comentario }) {
    if (!gymSlug) {
      throw new HttpError("Debes seleccionar un gimnasio.");
    }

    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      throw new HttpError("Selecciona una calificación entre 1 y 5.");
    }

    if (!comentario?.trim()) {
      throw new HttpError("Escribe un comentario.");
    }

    try {
      const { resena } = await http.post("/api/resenas", {
        gymSlug,
        calificacion,
        comentario: comentario.trim(),
      });

      return resena;
    } catch (err) {
      if (err instanceof HttpError && err.status === 400) {
        throw err;
      }

      throw withMessage(err, "No se pudo publicar la reseña.");
    }
  },

  // Consulta todas las reseñas. Solo funciona para super_admin.
  async getAllReviews() {
    try {
      const { resenas } = await http.get("/api/resenas/todas");
      return resenas;
    } catch (err) {
      throw withMessage(err, "No se pudieron cargar todas las reseñas.");
    }
  },
};

export default reviewsApi;
