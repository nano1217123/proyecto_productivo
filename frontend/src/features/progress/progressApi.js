import { readNutrition } from "@/src/features/nutrition/api/nutritionApi";
import { http } from "@/src/lib/api/httpClient";
import { civilDate, dayKey } from "@/src/features/training/hooks/historyDates";

const root = "/api/progreso";
function get(path, params, signal) {
  return http.get(`${path}?${new URLSearchParams(params)}`, { signal, cache: "no-store" });
}

export const periods = { "7": "Últimos 7 días", "30": "Últimos 30 días", "90": "Últimos 90 días", "180": "Últimos 6 meses", all: "Historial completo" };

export function rangeFor(period, today) {
  if (period === "all") return { hasta: today };
  const start = civilDate(today);
  if (period === "180") {
    const day = start.getUTCDate();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - 6);
    const endOfMonth = new Date(start);
    endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1, 0);
    start.setUTCDate(Math.min(day, endOfMonth.getUTCDate()));
  } else start.setUTCDate(start.getUTCDate() - Number(period) + 1);
  return { desde: dayKey(start), hasta: today };
}

export const progressApi = {
  weight: (params, signal) => get(`${root}/peso`, params, signal),
  height: (signal) => http.get("/api/perfil/altura", { signal, cache: "no-store" }),
  saveHeight: (alturaCm) => http.patch("/api/perfil/altura", { alturaCm }),
  addWeight: (id, pesoActualKg) => http.post(`${root}/peso`, { id, pesoActualKg }),
  editWeight: (id, pesoActualKg) => http.patch(`${root}/peso/${id}`, { pesoActualKg }),
  deleteWeight: (id) => http.del(`${root}/peso/${id}`),
  sport: (params, signal) => get(`${root}/deporte`, params, signal),
  exercise: (id, params, signal) => get(`${root}/ejercicios/${id}`, params, signal),
  nutrition: (signal) => readNutrition("resumen-inicio", {}, signal),
};
