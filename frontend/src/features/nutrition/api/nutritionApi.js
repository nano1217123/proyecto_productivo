import { http } from "@/src/lib/api/httpClient";

export function readNutrition(path, params = {}, signal) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ""));
  return http.get(`/api/nutricion/${path}?${query}`, { signal, cache: "no-store" });
}
export const nutritionApi = {
  profile: (data) => http.patch("/api/nutricion/perfil", data),
  quote: (data, id, signal) => http.post(`/api/nutricion/aporte${id ? "/" + id : ""}`, data, { signal }),
  save: (data, id) => id ? http.patch(`/api/nutricion/registros/${id}`, data) : http.post("/api/nutricion/registros", data),
  remove: (id) => http.del(`/api/nutricion/registros/${id}`),
  favorite: (id, enabled) => enabled ? http.put(`/api/nutricion/favoritos/${id}`) : http.del(`/api/nutricion/favoritos/${id}`),
};
