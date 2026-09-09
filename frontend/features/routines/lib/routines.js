import { supabase } from "@/features/auth/api/supabaseClient";

// Trae todas las rutinas del usuario, con la cantidad de ejercicios de
// cada una (para mostrar "5 ejercicios" en la lista sin traer el detalle completo).
export async function getRoutines() {
  const { data, error } = await supabase
    .from("rutinas")
    .select("id, nombre, dia_etiqueta, creado_en, rutina_ejercicios(id)")
    .order("creado_en", { ascending: false });

  if (error) throw new Error("No se pudieron cargar tus rutinas.");

  return data.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    dia_etiqueta: r.dia_etiqueta,
    total_ejercicios: r.rutina_ejercicios?.length || 0,
  }));
}

// Trae una rutina con sus ejercicios en orden, incluyendo nombre y grupo
// muscular de cada uno (para mostrarlos legibles sin otra consulta).
export async function getRoutineDetail(rutinaId) {
  const { data, error } = await supabase
    .from("rutinas")
    .select("id, nombre, dia_etiqueta, rutina_ejercicios(id, orden, ejercicio_id, ejercicios(nombre, grupo_nombre))")
    .eq("id", rutinaId)
    .single();

  if (error) throw new Error("No se pudo cargar la rutina.");

  return {
    id: data.id,
    nombre: data.nombre,
    dia_etiqueta: data.dia_etiqueta,
    ejercicios: (data.rutina_ejercicios || [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((re) => ({
        ejercicio_id: re.ejercicio_id,
        orden: re.orden,
        nombre: re.ejercicios?.nombre,
        grupo_nombre: re.ejercicios?.grupo_nombre,
      })),
  };
}

// Crea una rutina nueva con sus ejercicios (en el orden del array recibido).
// ejercicioIds: array de IDs de ejercicios, en el orden deseado.
export async function createRoutine({ usuarioId, nombre, diaEtiqueta, ejercicioIds }) {
  if (!nombre?.trim()) throw new Error("La rutina necesita un nombre.");
  if (!ejercicioIds || ejercicioIds.length === 0) {
    throw new Error("Agrega al menos un ejercicio a la rutina.");
  }

  const { data: rutina, error: rutinaError } = await supabase
    .from("rutinas")
    .insert({ usuario_id: usuarioId, nombre: nombre.trim(), dia_etiqueta: diaEtiqueta?.trim() || null })
    .select()
    .single();

  if (rutinaError) throw new Error("No se pudo crear la rutina.");

  const filas = ejercicioIds.map((ejercicioId, idx) => ({
    rutina_id: rutina.id,
    ejercicio_id: ejercicioId,
    orden: idx + 1,
  }));

  const { error: ejerciciosError } = await supabase.from("rutina_ejercicios").insert(filas);

  if (ejerciciosError) {
    await supabase.from("rutinas").delete().eq("id", rutina.id);
    throw new Error("No se pudieron guardar los ejercicios de la rutina.");
  }

  return rutina;
}

// Actualiza nombre/etiqueta y reemplaza por completo la lista de ejercicios
// (borra las filas existentes y reinserta con el nuevo orden).
export async function updateRoutine({ rutinaId, nombre, diaEtiqueta, ejercicioIds }) {
  if (!nombre?.trim()) throw new Error("La rutina necesita un nombre.");
  if (!ejercicioIds || ejercicioIds.length === 0) {
    throw new Error("La rutina debe tener al menos un ejercicio.");
  }

  const { error: updateError } = await supabase
    .from("rutinas")
    .update({ nombre: nombre.trim(), dia_etiqueta: diaEtiqueta?.trim() || null })
    .eq("id", rutinaId);

  if (updateError) throw new Error("No se pudo actualizar la rutina.");

  const { error: deleteError } = await supabase.from("rutina_ejercicios").delete().eq("rutina_id", rutinaId);
  if (deleteError) throw new Error("No se pudieron actualizar los ejercicios de la rutina.");

  const filas = ejercicioIds.map((ejercicioId, idx) => ({
    rutina_id: rutinaId,
    ejercicio_id: ejercicioId,
    orden: idx + 1,
  }));

  const { error: insertError } = await supabase.from("rutina_ejercicios").insert(filas);
  if (insertError) throw new Error("No se pudieron guardar los ejercicios de la rutina.");
}

export async function deleteRoutine(rutinaId) {
  const { error } = await supabase.from("rutinas").delete().eq("id", rutinaId);
  if (error) throw new Error("No se pudo eliminar la rutina.");
}