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
  // Se envían la sede y el importe COP que el usuario confirmó: el backend
  // decide el plan y el importe, y responde 409 sin crear el intento si el
  // importe confirmado ya no es el vigente.
  async startWompiCheckout({ gymSlug = null, montoEnCentavos } = {}) {
    try {
      return await http.post("/api/pagos/wompi/checkout", {
        ...(gymSlug ? { gymSlug } : {}),
        montoEnCentavos,
      });
    } catch (err) {
      throw withMessage(err, "No se pudo iniciar el pago.");
    }
  },

  // Estado de un intento según el backend: por referencia o, si falta, por
  // el id de transacción que Wompi añade al volver.
  async getPaymentStatus({ referencia = null, transaccionId = null } = {}, options) {
    const params = new URLSearchParams();
    if (referencia) params.set("referencia", referencia);
    if (transaccionId) params.set("id", transaccionId);
    try {
      const { pago } = await http.get(`/api/pagos/estado?${params}`, {
        cache: "no-store",
        ...options,
      });
      return pago;
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      throw withMessage(err, "No se pudo consultar el estado del pago.");
    }
  },

  // Pide al backend que verifique con Wompi un pago pendiente (por si el
  // aviso del webhook no llegó). Devuelve { pago, conciliacion }. El backend
  // limita la frecuencia y solo concilia pagos que el usuario puede ver.
  async reconcilePayment(referencia, options) {
    try {
      return await http.post("/api/pagos/conciliar", { referencia }, options);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      throw withMessage(err, "No se pudo verificar el pago con Wompi.");
    }
  },
};

export default paymentsApi;
