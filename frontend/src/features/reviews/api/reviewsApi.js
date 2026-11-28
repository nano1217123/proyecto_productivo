
import { http, HttpError } from "@/src/lib/api/httpClient";

function withMessage(err, message) {
  if (err instanceof HttpError) {
    return err;
  }

  return new HttpError(message);
}

export const reviewsApi = {
  // Consulta las reseñas de la comunidad de un gimnasio.
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

  async getPublicReviewPage(gymSlug, { pagina = 1, orden, calificacion, buscar } = {}) {
    const query = new URLSearchParams({ pagina: String(pagina) });
    if (orden) query.set("orden", orden);
    if (calificacion) query.set("calificacion", calificacion);
    if (buscar) query.set("buscar", buscar);
    return http.get(`/api/resenas/gimnasio/${encodeURIComponent(gymSlug)}?${query}`);
  },
  async getAdminReviewPage(gymSlug, { pagina = 1, orden, calificacion, buscar, estadoRespuesta } = {}) {
    const query = new URLSearchParams({ pagina: String(pagina) });
    for (const [campo, valor] of Object.entries({ orden, calificacion, buscar, estadoRespuesta })) {
      if (valor) query.set(campo, valor);
    }
    return http.get(`/api/resenas/gestion/gimnasio/${encodeURIComponent(gymSlug)}?${query}`);
  },

  async manageOfficialReply(id, accion, texto) {
    const path = `/api/resenas/gestion/${encodeURIComponent(id)}/respuesta`;
    if (accion === "retirar") return http.del(path);
    if (accion === "editar") return http.patch(path, { texto });
    return http.post(path, { texto });
  },

  async setHelpfulVote(id, marcar) {
    const path = `/api/resenas/${encodeURIComponent(id)}/voto-util`;
    return marcar ? http.put(path) : http.del(path);
  },

  async reportReview(id, datos) {
    return http.post(`/api/resenas/${encodeURIComponent(id)}/denuncias`, datos);
  },

  async getModerationPage(vista, pagina, gymSlug) {
    const query = new URLSearchParams({ pagina: String(pagina) });
    if (gymSlug) query.set("gymSlug", gymSlug);
    return http.get(`/api/resenas/moderacion/${vista}?${query}`);
  },

  async decideReport(id, decision) {
    return http.post(`/api/resenas/moderacion/denuncias/${encodeURIComponent(id)}/decisiones`, decision);
  },

  async restoreReview(id, revision, motivo) {
    return http.post(`/api/resenas/moderacion/resenas/${encodeURIComponent(id)}/restaurar`, {
      accion: "RESTAURAR", motivo, revision,
    });
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

  async getOwnReviews() {
    const { resenas } = await http.get("/api/resenas/mias");
    return resenas;
  },

  async updateOwnReview(id, { calificacion, comentario }) {
    const { resena } = await http.patch(`/api/resenas/mias/${encodeURIComponent(id)}`, {
      calificacion, comentario,
    });
    return resena;
  },

  async deleteOwnReview(id) {
    await http.del(`/api/resenas/mias/${encodeURIComponent(id)}`);
  },
};

export default reviewsApi;
