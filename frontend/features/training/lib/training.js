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

// ============================================================
// CATÁLOGO DE EJERCICIOS
// ============================================================

export async function getExerciseCatalog() {
  try {
    const { grupos } = await request("/api/ejercicios");
    return grupos;
  } catch {
    throw new Error("No se pudo cargar el catálogo de ejercicios.");
  }
}

// ============================================================
// ENTRENAMIENTOS
// ============================================================

// Guarda una sesión completa: entrenamiento + series.
// series: [{ ejercicio_id, numero_serie, repeticiones, peso_kg }]
export async function saveTrainingSession({ fecha, notas, series }) {
  if (!series || series.length === 0) {
    throw new Error("Agrega al menos una serie antes de guardar.");
  }

  try {
    const result = await request("/api/entrenamientos", {
      method: "POST",
      body: JSON.stringify({
        fecha,
        notas: notas || null,
        series,
      }),
    });
    return result;
  } catch (err) {
    if (err.status === 400) throw err; // mensaje de validación del backend
    throw new Error("No se pudo guardar el entrenamiento.");
  }
}

// Trae el historial completo del usuario con sus series y nombre de ejercicio.
export async function getTrainingHistory() {
  try {
    const { entrenamientos } = await request("/api/entrenamientos");

    // Adaptamos la estructura del backend al formato que espera la UI
    // (que viene del shape que devolvía Supabase: series_entrenamiento, ejercicios.nombre).
    return entrenamientos.map((e) => ({
      id: e.id,
      fecha: e.fecha,
      notas: e.notas,
      series_entrenamiento: e.series.map((s) => ({
        id: s.id,
        ejercicio_id: s.ejercicio_id,
        numero_serie: s.numero_serie,
        repeticiones: s.repeticiones,
        peso_kg: s.peso_kg,
        ejercicios: { nombre: s.ejercicio_nombre },
      })),
    }));
  } catch {
    throw new Error("No se pudo cargar el historial de entrenamientos.");
  }
}

// Progreso de un ejercicio: { fecha, peso_max }[]
export async function getExerciseHistory(ejercicioId) {
  try {
    const { progreso } = await request(
      `/api/entrenamientos/ejercicio/${ejercicioId}/progreso`
    );
    return progreso;
  } catch {
    throw new Error("No se pudo cargar el historial de este ejercicio.");
  }
}

// Eliminar un entrenamiento (por si se usa en la UI más adelante).
export async function deleteTrainingSession(entrenamientoId) {
  try {
    await request(`/api/entrenamientos/${entrenamientoId}`, {
      method: "DELETE",
    });
  } catch {
    throw new Error("No se pudo eliminar el entrenamiento.");
  }
}