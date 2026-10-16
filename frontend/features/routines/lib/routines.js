// Cliente HTTP hacia el backend propio.
// Todas las peticiones van con credentials: 'include' para que las cookies
// httpOnly viajen y el backend identifique al usuario.

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
    const message = body?.message || `Error ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

// Lista las rutinas del usuario autenticado.
export async function getRoutines() {
  try {
    const { rutinas } = await request("/api/rutinas");
    return rutinas;
  } catch {
    throw new Error("No se pudieron cargar tus rutinas.");
  }
}

// Detalle de una rutina con sus ejercicios ordenados.
export async function getRoutineDetail(rutinaId) {
  try {
    const { rutina } = await request(`/api/rutinas/${rutinaId}`);
    return rutina;
  } catch (err) {
    if (err.status === 404) {
      throw new Error("No se pudo cargar la rutina.");
    }
    throw new Error("No se pudo cargar la rutina.");
  }
}

// Crea una rutina nueva.
// input: { nombre, diaEtiqueta, ejercicioIds }
export async function createRoutine({ nombre, diaEtiqueta, ejercicioIds }) {
  if (!nombre?.trim()) throw new Error("La rutina necesita un nombre.");
  if (!ejercicioIds || ejercicioIds.length === 0) {
    throw new Error("Agrega al menos un ejercicio a la rutina.");
  }

  try {
    const result = await request("/api/rutinas", {
      method: "POST",
      body: JSON.stringify({
        nombre: nombre.trim(),
        diaEtiqueta: diaEtiqueta?.trim() || null,
        ejercicioIds,
      }),
    });
    return result;
  } catch (err) {
    if (err.status === 400) throw err; // mensaje de validación del backend
    throw new Error("No se pudo crear la rutina.");
  }
}

// Actualiza una rutina existente.
export async function updateRoutine({
  rutinaId,
  nombre,
  diaEtiqueta,
  ejercicioIds,
}) {
  if (!nombre?.trim()) throw new Error("La rutina necesita un nombre.");
  if (!ejercicioIds || ejercicioIds.length === 0) {
    throw new Error("La rutina debe tener al menos un ejercicio.");
  }

  try {
    await request(`/api/rutinas/${rutinaId}`, {
      method: "PUT",
      body: JSON.stringify({
        nombre: nombre.trim(),
        diaEtiqueta: diaEtiqueta?.trim() || null,
        ejercicioIds,
      }),
    });
  } catch (err) {
    if (err.status === 400 || err.status === 404) throw err;
    throw new Error("No se pudo actualizar la rutina.");
  }
}

// Elimina una rutina.
export async function deleteRoutine(rutinaId) {
  try {
    await request(`/api/rutinas/${rutinaId}`, { method: "DELETE" });
  } catch {
    throw new Error("No se pudo eliminar la rutina.");
  }
}