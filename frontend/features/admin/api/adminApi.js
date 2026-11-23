/**
 * API del panel de administración de la feature "dashboard".
 *
 * Expone las operaciones exclusivas de admin:
 *   - Crear un administrador.
 *   - Subir una imagen al storage (Cloudinary o similar).
 *   - Asignar una imagen a un ejercicio.
 *
 * Usa el cliente HTTP base (lib/api/httpClient.js) que centraliza URL base,
 * cookies y errores. FormData es detectado automáticamente por httpClient:
 * no añade Content-Type para que el navegador ponga el boundary correcto.
 */

import { http } from "@/lib/api/httpClient";

export const adminApi = {
  /**
   * Crea un nuevo administrador. El backend envía un código de verificación
   * por correo; el admin debe verificarlo antes de poder iniciar sesión.
   *
   * @param {{ nombres: string, apellidos: string, email: string, password: string, tipoUsuario?: string }} data
   * @returns {Promise<object>}
   */
  createAdmin(data) {
    return http.post("/api/auth/create-admin", {
      tipoUsuario: "admin",
      ...data,
    });
  },

  /**
   * Sube una imagen al storage del backend.
   *
   * @param {File} file  Archivo de imagen a subir.
   * @returns {Promise<{ url: string }>} URL pública de la imagen subida.
   *
   * El nombre del campo ("imagen") es un contrato con el backend
   * (upload.single("imagen")). Por eso lo encapsulamos aquí: el componente
   * no debe conocer ese detalle.
   */
  uploadImage(file) {
    const formData = new FormData();
    formData.append("imagen", file);
    return http.post("/api/imagenes/subir", formData);
  },

  /**
   * Asigna una URL de imagen a un ejercicio existente.
   *
   * @param {string|number} ejercicioId
   * @param {string} imagenUrl
   * @returns {Promise<object>}
   */
  assignImageToExercise(ejercicioId, imagenUrl) {
    return http.patch(`/api/ejercicios/${ejercicioId}/imagen`, { imagenUrl });
  },
};

export default adminApi;
