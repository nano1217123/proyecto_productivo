import { modes, newExercise } from "../training/hooks/trainingSessionModel.js";

export const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const planFields = {
  series: { label: "Series", min: 1, max: 30 },
  repeticiones: { label: "Repeticiones objetivo / mín.", min: 1, max: 999 },
  repeticionesMax: { label: "Repeticiones máx.", min: 1, max: 999 },
  pesoKg: { label: "Peso objetivo (kg)", min: 0, max: 1500, step: "any" },
  asistenciaKg: { label: "Asistencia objetivo (kg)", min: 0, max: 1500, step: "any" },
  descanso: { label: "Descanso (s)", min: 0, max: 3600 },
  duracionSeg: { label: "Duración (s)", min: 1, max: 86400 },
  distanciaKm: { label: "Distancia (km)", min: 0, max: 1000, step: "any" },
};

export function fieldsFor(type, timedMobility) {
  const measured = modes[type]?.fields ?? modes.fuerza.fields;
  const keys = type === "cardio" ? [] : ["series"];
  if (measured.includes("repeticiones") && !(type === "movilidad" && timedMobility)) keys.push("repeticiones", "repeticionesMax");
  if (measured.includes("duracion_seg") && (type !== "movilidad" || timedMobility)) keys.push("duracionSeg");
  if (measured.includes("distancia_km")) keys.push("distanciaKm");
  if (measured.includes("peso_kg")) keys.push("pesoKg");
  if (measured.includes("asistencia_kg")) keys.push("asistenciaKg");
  if (type !== "cardio") keys.push("descanso");
  return keys;
}

export function exerciseType(item) {
  return item.plan?.tipo || newExercise(item.ejercicio_id ?? item.id, item).tipo;
}

export function routineStats(items) {
  const groups = [...new Set(items.map((item) => item.grupo_nombre).filter(Boolean))];
  let series = 0;
  let seconds = Math.max(0, items.length - 1) * 30;
  let known = items.length > 0;
  for (const item of items) {
    const plan = item.plan || {};
    const count = plan.series ?? 1;
    const execution = plan.duracionSeg ?? (plan.repeticiones == null ? null : (plan.repeticionesMax ?? plan.repeticiones) * 3);
    series += count;
    known &&= execution != null;
    seconds += (execution ?? 0) * count + (plan.descanso ?? 60) * (count - 1);
  }
  return { groups, series, minutes: known ? Math.ceil(seconds / 60) : null };
}

export function routineUrl(gym, path = "") {
  return `/dashboard/rutinas${path}?gym=${encodeURIComponent(gym)}`;
}
