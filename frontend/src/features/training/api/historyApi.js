import { http } from "@/src/lib/api/httpClient";

const root = "/api/entrenamientos";
const query = (values) => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== "" && value != null && value !== false));

export const historyApi = {
  list: (filters, signal) => http.get(`${root}/historial?${query(filters)}`, { signal }),
  home: (dates, signal) => http.get(`${root}/resumen-inicio?${query(dates)}`, { signal, cache: "no-store" }),
  activity: (dates, signal) => http.get(`${root}/actividad?${query(dates)}`, { signal }),
  detail: (id, signal) => http.get(`${root}/${id}`, { signal }),
  compare: (anterior, reciente, signal) => http.get(`${root}/comparar?${query({ anterior, reciente })}`, { signal }),
  update: (id, input) => http.patch(`${root}/${id}`, input),
  delete: (id) => http.del(`${root}/${id}`),
  repeat: (id, requestId) => http.post(`${root}/${id}/repetir`, { id: requestId }),
};
