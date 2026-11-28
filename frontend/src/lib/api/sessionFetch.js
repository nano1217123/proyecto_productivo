// El navegador conserva las cookies HttpOnly y coordina la rotación por origen.
export const SESSION_ENDED = "jjgym:session-ended";

let renewal;

export function withSessionLock(operation) {
  return navigator.locks
    ? navigator.locks.request("jjgym:session", operation)
    : operation();
}

function renewSession() {
  if (!renewal) {
    renewal = withSessionLock(async () => {
      // Otra pestaña pudo renovar las cookies mientras esperábamos el bloqueo.
      const options = { credentials: "include", cache: "no-store" };
      const profile = await fetch("/api/perfil", options);
      if (profile.status !== 401) return profile;

      const refresh = await fetch("/api/auth/refresh", { ...options, method: "POST" });
      if (refresh.status === 401) window.dispatchEvent(new Event(SESSION_ENDED));
      return refresh;
    }).finally(() => { renewal = undefined; });
  }
  return renewal;
}

export async function sessionFetch(url, options) {
  const response = await fetch(url, options);
  if (response.status !== 401 || typeof window === "undefined" ||
    !url.startsWith("/api/") || url.startsWith("/api/auth/")) return response;

  options?.signal?.throwIfAborted();
  const refreshed = await renewSession();
  options?.signal?.throwIfAborted();
  if (!refreshed.ok) {
    // Cada consumidor recibe su propia copia del cuerpo de error.
    return refreshed.clone();
  }
  return fetch(url, options);
}
