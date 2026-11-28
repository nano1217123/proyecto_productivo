export const fields = {
  peso_kg: { label: "Peso (kg)", max: 1500, step: "any" },
  repeticiones: { label: "Reps", max: 999, step: 1 },
  duracion_seg: { label: "Tiempo (s)", max: 86400, step: 1 },
  distancia_km: { label: "Km", max: 1000, step: "any" },
  asistencia_kg: { label: "Asistencia (kg)", max: 1500, step: "any" },
};

export const modes = {
  fuerza: { label: "Fuerza con peso", fields: ["peso_kg", "repeticiones"] },
  corporal: { label: "Peso corporal", fields: ["repeticiones"] },
  carga_adicional: { label: "Carga adicional", fields: ["peso_kg", "repeticiones"] },
  asistido: { label: "Asistido", fields: ["asistencia_kg", "repeticiones"] },
  isometrico: { label: "Isométrico", fields: ["duracion_seg"] },
  cardio: { label: "Cardiovascular", fields: ["duracion_seg", "distancia_km"] },
  movilidad: { label: "Movilidad", fields: ["duracion_seg", "repeticiones"] },
  estiramiento: { label: "Estiramiento", fields: ["duracion_seg"] },
};

const normalize = (value) => (value || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export { normalize };

export function newExercise(ejercicioId, metadata) {
  const nombre = normalize(metadata?.nombre);
  const equipo = normalize(metadata?.equipo);
  const hints = [
    [/estiramiento/, "estiramiento"], [/movilidad/, "movilidad"], [/plancha|isometric/, "isometrico"],
    [/caminadora|eliptica|bicicleta estatica/, "cardio"], [/asistid/, "asistido"],
  ];
  const tipo = hints.find(([pattern]) => pattern.test(`${nombre} ${equipo}`))?.[1]
    || (equipo === "peso corporal" ? "corporal" : "fuerza");
  return { ejercicio_id: Number(ejercicioId), tipo, descanso: 60, notas: "", series: [{ completada: false }] };
}

export function validSet(tipo, serie) {
  if (tipo === "movilidad") return (serie.repeticiones != null) !== (serie.duracion_seg != null);
  return modes[tipo].fields.every((field) => field === "distancia_km" || serie[field] != null);
}

export function changeMeasure(serie, tipo, field, raw) {
  const value = raw === "" ? null : Number(raw);
  const definition = fields[field];
  const min = definition.step === 1 ? 1 : 0;
  if (value !== null && (!Number.isFinite(value) || value < min || value > definition.max
    || (definition.step === 1 && !Number.isInteger(value)))) return serie;
  const next = { ...serie, [field]: value };
  if (tipo === "movilidad" && value !== null) {
    next[field === "repeticiones" ? "duracion_seg" : "repeticiones"] = null;
  }
  return { ...next, completada: next.completada && validSet(tipo, next) };
}

export function measureLabel(serie) {
  if (!serie) return "—";
  const parts = [];
  if (serie.peso_kg != null) parts.push(`${serie.peso_kg} kg`);
  if (serie.asistencia_kg != null) parts.push(`${serie.asistencia_kg} kg asist.`);
  if (serie.repeticiones != null) parts.push(`${serie.repeticiones} reps`);
  if (serie.duracion_seg != null) parts.push(`${serie.duracion_seg} s`);
  if (serie.distancia_km != null) parts.push(`${serie.distancia_km} km`);
  return parts.join(" × ") || "—";
}

export function sessionStats(contenido) {
  const exercises = contenido.ejercicios;
  const sets = exercises.flatMap((item) => item.series);
  const done = sets.filter((set) => set.completada).length;
  const volume = exercises.filter((item) => item.tipo === "fuerza")
    .flatMap((item) => item.series)
    .reduce((sum, set) => sum + (set.completada ? (set.peso_kg ?? 0) * (set.repeticiones ?? 0) : 0), 0);
  return { exercises: exercises.length, total: sets.length, done, volume };
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function duration(session) {
  return session.iniciadoEn && session.finalizadoEn
    ? Math.max(0, Math.floor((Date.parse(session.finalizadoEn) - Date.parse(session.iniciadoEn)) / 1000))
    : null;
}

export function repeatContent(session) {
  if (session.sesion) {
    return { ...session.sesion, notas: "", ejercicios: session.sesion.ejercicios.map((item) => ({
      ...item, notas: "", series: item.series.map((set) => ({ ...set, completada: false })),
    })) };
  }
  const exercises = new Map();
  for (const set of session.series_entrenamiento) {
    if (!exercises.has(set.ejercicio_id)) {
      const item = newExercise(set.ejercicio_id);
      item.tipo = set.peso_kg == null ? "corporal" : "fuerza";
      item.series = [];
      exercises.set(set.ejercicio_id, item);
    }
    exercises.get(set.ejercicio_id).series.push({ repeticiones: set.repeticiones, peso_kg: set.peso_kg, completada: false });
  }
  return { nombre: session.nombre || "Entrenamiento repetido", notas: "", ejercicios: [...exercises.values()] };
}

export function historyReference(history, exerciseId, tipo) {
  let last;
  let best = null;
  for (const session of history) {
    const series = session.series_entrenamiento.filter((set) => set.ejercicio_id === exerciseId &&
      (set.tipo || (set.peso_kg == null ? "corporal" : "fuerza")) === tipo);
    if (!series.length) continue;
    last ??= { date: session.fecha, series };
    if (tipo === "fuerza" || tipo === "carga_adicional") {
      for (const set of series) {
        if (set.peso_kg != null && (best == null || set.peso_kg > best)) best = set.peso_kg;
      }
    }
  }
  return { last, best };
}
