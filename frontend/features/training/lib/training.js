import { supabase } from "@/features/auth/api/supabaseClient";

// Trae el catálogo de ejercicios agrupado por grupo muscular, tal como
// lo necesita un selector "elige tu ejercicio". Es de lectura pública
// (RLS lo permite para cualquiera), así que no requiere estar logueado.
export async function getExerciseCatalog() {
  const { data, error } = await supabase
    .from("ejercicios")
    .select("id, grupo_slug, grupo_nombre, nombre, slug")
    .order("grupo_nombre", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) throw new Error("No se pudo cargar el catálogo de ejercicios.");

  const grupos = new Map();
  for (const ex of data) {
    if (!grupos.has(ex.grupo_slug)) {
      grupos.set(ex.grupo_slug, { slug: ex.grupo_slug, nombre: ex.grupo_nombre, ejercicios: [] });
    }
    grupos.get(ex.grupo_slug).ejercicios.push(ex);
  }
  return Array.from(grupos.values());
}

// Guarda una sesión de entrenamiento completa: crea la fila en
// "entrenamientos" y luego todas sus series en "series_entrenamiento".
// series: [{ ejercicio_id, numero_serie, repeticiones, peso_kg }]
export async function saveTrainingSession({ usuarioId, fecha, notas, series }) {
  if (!series || series.length === 0) {
    throw new Error("Agrega al menos una serie antes de guardar.");
  }

  const { data: sesion, error: sesionError } = await supabase
    .from("entrenamientos")
    .insert({ usuario_id: usuarioId, fecha, notas: notas || null })
    .select()
    .single();

  if (sesionError) throw new Error("No se pudo crear la sesión de entrenamiento.");

  const filas = series.map((s) => ({
    entrenamiento_id: sesion.id,
    ejercicio_id: s.ejercicio_id,
    usuario_id: usuarioId,
    numero_serie: s.numero_serie,
    repeticiones: s.repeticiones,
    peso_kg: s.peso_kg,
  }));

  const { error: seriesError } = await supabase.from("series_entrenamiento").insert(filas);

  if (seriesError) {
    // La sesión ya se creó pero las series fallaron: la borramos para no
    // dejar una sesión vacía y confusa en el historial del usuario.
    await supabase.from("entrenamientos").delete().eq("id", sesion.id);
    throw new Error("No se pudieron guardar las series. Intenta de nuevo.");
  }

  return sesion;
}

// Trae el historial de sesiones del usuario, con sus series y el nombre
// del ejercicio de cada una (join a través de la relación en Supabase).
export async function getTrainingHistory() {
  const { data, error } = await supabase
    .from("entrenamientos")
    .select("id, fecha, notas, series_entrenamiento(id, ejercicio_id, numero_serie, repeticiones, peso_kg, ejercicios(nombre))")
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error("No se pudo cargar el historial de entrenamientos.");
  return data;
}

// Trae la evolución de un ejercicio específico a lo largo del tiempo,
// para el gráfico de progreso: fecha + el peso máximo usado ese día.
export async function getExerciseHistory(ejercicioId) {
  const { data, error } = await supabase
    .from("series_entrenamiento")
    .select("repeticiones, peso_kg, entrenamientos(fecha)")
    .eq("ejercicio_id", ejercicioId)
    .order("entrenamientos(fecha)", { ascending: true });

  if (error) throw new Error("No se pudo cargar el historial de este ejercicio.");

  // Agrupa por fecha y se queda con el peso máximo levantado ese día
  // (una sesión puede tener varias series del mismo ejercicio).
  const porFecha = new Map();
  for (const serie of data) {
    const fecha = serie.entrenamientos?.fecha;
    if (!fecha) continue;
    const pesoActual = porFecha.get(fecha) || 0;
    if ((serie.peso_kg || 0) > pesoActual) porFecha.set(fecha, serie.peso_kg || 0);
  }

  return Array.from(porFecha.entries())
    .map(([fecha, peso_max]) => ({ fecha, peso_max }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}