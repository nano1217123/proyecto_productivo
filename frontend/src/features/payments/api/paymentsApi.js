import { http, HttpError } from "@/src/lib/api/httpClient";

// Si el backend respondió, su mensaje ya es apto para el usuario
// (400, 403, 503...). Errores de red u otros usan un mensaje genérico.
function withMessage(err, message) {
  if (err instanceof HttpError && err.status > 0) {
    return err;
  }
  return new HttpError(message);
}

export const paymentsApi = {
  // Planes y sedes que el usuario autenticado puede pagar.
  async getOptions() {
    try {
      const { opciones } = await http.get("/api/pagos/opciones");
      return opciones;
    } catch (err) {
      throw withMessage(err, "No se pudieron cargar las opciones de pago.");
    }
  },

  // Registra el intento de pago y devuelve { pago, checkoutUrl }.
  // Solo se envía la sede: el backend decide el plan y el importe.
  async startWompiCheckout({ gymSlug = null } = {}) {
    try {
      return await http.post(
        "/api/pagos/wompi/checkout",
        gymSlug ? { gymSlug } : {}
      );
    } catch (err) {
      throw withMessage(err, "No se pudo iniciar el pago.");
    }
  },
};

export default paymentsApi;
