/**
 * API de la feature "auth".
 *
 * Puerta de entrada para todas las operaciones de autenticación.
 * Usa el cliente HTTP base (lib/api/httpClient.js) que centraliza:
 *   - Base URL (config/env.js).
 *   - Cookies de sesión (credentials: 'include').
 *   - Serialización JSON automática.
 *   - Errores estructurados (HttpError con status/body).
 *
 * Importante: NO traducimos los mensajes de error del backend. El servidor
 * ya devuelve mensajes en español específicos por caso (credenciales
 * inválidas, email no verificado, etc.), y algunos consumidores (LoginPage)
 * inspeccionan err.status para redirigir a /verify-otp. Preservar el
 * mensaje y el status del backend es intencional.
 */

import { http } from "@/lib/api/httpClient";

export const authApi = {
  register: (data) => http.post("/api/auth/register", data),

  verifyEmail: (data) => http.post("/api/auth/verify-email", data),

  resendCode: (data) => http.post("/api/auth/resend-code", data),

  login: (data) => http.post("/api/auth/login", data),

  logout: () => http.post("/api/auth/logout"),

  refresh: () => http.post("/api/auth/refresh"),

  forgotPassword: (data) => http.post("/api/auth/forgot-password", data),

  resetPassword: (data) => http.post("/api/auth/reset-password", data),

  getProfile: () => http.get("/api/perfil"),
};

export default authApi;
