"use client";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    // respuesta sin body
  }

  if (!response.ok) {
    const message =
      body?.message || `Error ${response.status} en la petición.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

export const apiClient = {
  register: (data) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmail: (data) =>
    request("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resendCode: (data) =>
    request("/api/auth/resend-code", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () => request("/api/auth/logout", { method: "POST" }),

  refresh: () => request("/api/auth/refresh", { method: "POST" }),

  forgotPassword: (data) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetPassword: (data) =>
    request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProfile: () => request("/api/perfil"),
};