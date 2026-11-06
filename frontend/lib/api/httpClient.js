/**
 * Cliente HTTP base del frontend.
 *
 * Única puerta de entrada para comunicación con el backend.
 * Centraliza:
 *   - Base URL (desde config/env.js).
 *   - Cookies de sesión (credentials: 'include').
 *   - Serialización JSON.
 *   - Manejo uniforme de errores HTTP y de red.
 *
 * NO maneja estado (loading/error/data): eso es responsabilidad de los hooks
 * que consuman este cliente (useExercises, useRoutines, etc.).
 */

import { env } from "@/config/env";

/**
 * Error estructurado para fallos HTTP o de red.
 * Los consumidores pueden inspeccionar `status` y `body` para decidir.
 */
export class HttpError extends Error {
  constructor(message, { status = 0, body = null, url = "" } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/**
 * Construye la URL final combinando base + path.
 * No duplica slashes.
 */
function buildUrl(path) {
  if (!path) return env.apiUrl;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${env.apiUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Petición HTTP genérica.
 *
 * @param {string} path     Ruta relativa (ej: "/api/perfil") o URL absoluta.
 * @param {object} options  Opciones: method, body, headers, signal, etc.
 * @returns {Promise<any>}  Body parseado (JSON o texto) o null si 204.
 * @throws {HttpError}      Si la respuesta no es 2xx o hay error de red.
 */
export async function request(path, options = {}) {
  const { method = "GET", body, headers = {}, signal, ...rest } = options;

  const finalHeaders = { ...headers };

  let finalBody = body;
  if (
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData)
  ) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const url = buildUrl(path);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody,
      credentials: "include", // envía cookies (access_token)
      signal,
      ...rest,
    });
  } catch (err) {
    // Error de red (DNS, offline, CORS preflight fallido, abort...)
    if (err.name === "AbortError") throw err;
    throw new HttpError(
      "No se pudo contactar al servidor. Verifica tu conexión.",
      { status: 0, url }
    );
  }

  // 204 No Content
  if (response.status === 204) return null;

  // Intentar parsear según Content-Type
  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Error ${response.status} en ${method} ${path}`;
    throw new HttpError(message, {
      status: response.status,
      body: data,
      url,
    });
  }

  return data;
}

/**
 * Helpers de conveniencia por método HTTP.
 */
export const http = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    request(path, { ...options, method: "POST", body }),
  put: (path, body, options) =>
    request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) =>
    request(path, { ...options, method: "PATCH", body }),
  del: (path, options) => request(path, { ...options, method: "DELETE" }),
};

export default http;
