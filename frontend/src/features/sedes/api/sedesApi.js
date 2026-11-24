import { http, HttpError } from "@/src/lib/api/httpClient";

// Si el backend respondió, su mensaje ya es apto para el usuario.
function withMessage(err, message) {
  if (err instanceof HttpError && err.status > 0) return err;
  return new HttpError(message);
}

export const sedesApi = {
  // Catálogo público de sedes: [{ slug, nombre, ubicacion }].
  async getCatalogo() {
    try {
      const { sedes } = await http.get("/api/sedes");
      return sedes;
    } catch (err) {
      throw withMessage(err, "No se pudieron cargar las sedes.");
    }
  },

  // Vista previa de una cuenta por correo exacto (admin o super_admin).
  async buscarCuenta(correo) {
    try {
      const { cuenta } = await http.get(
        `/api/gestion/cuentas?correo=${encodeURIComponent(correo)}`
      );
      return cuenta;
    } catch (err) {
      throw withMessage(err, "No se pudo buscar la cuenta.");
    }
  },

  async listarClientes(gymSlug) {
    try {
      const { clientes } = await http.get(
        `/api/sedes/${encodeURIComponent(gymSlug)}/clientes`
      );
      return clientes;
    } catch (err) {
      throw withMessage(err, "No se pudieron cargar los clientes.");
    }
  },

  async clientesSinSede() {
    try {
      const { clientes } = await http.get("/api/gestion/clientes-sin-sede");
      return clientes;
    } catch (err) {
      throw withMessage(err, "No se pudieron cargar los clientes sin sede.");
    }
  },

  // Vincula la cuenta confirmada (id + correo) como cliente de la sede.
  async vincularCliente(gymSlug, { usuarioId, correo }) {
    try {
      return await http.post(
        `/api/sedes/${encodeURIComponent(gymSlug)}/clientes`,
        { usuarioId, correo }
      );
    } catch (err) {
      throw withMessage(err, "No se pudo vincular el cliente.");
    }
  },

  async desvincularCliente(gymSlug, usuarioId) {
    try {
      return await http.del(
        `/api/sedes/${encodeURIComponent(gymSlug)}/clientes/${encodeURIComponent(usuarioId)}`
      );
    } catch (err) {
      throw withMessage(err, "No se pudo desvincular el cliente.");
    }
  },
};

export default sedesApi;
