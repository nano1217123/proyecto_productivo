import { http } from "@/src/lib/api/httpClient";

const base = "/api/rutinas";
const route = (id) => `${base}/${encodeURIComponent(id)}`;

export const routinesApi = {
  schedule: (signal) => http.get(`${base}/planificacion`, { signal, cache: "no-store" }),
  async getRoutines(archived = false) {
    const { rutinas } = await http.get(archived ? `${base}?estado=archivadas` : base);
    return rutinas;
  },
  async getRoutineDetail(id, signal) {
    const { rutina } = await http.get(route(id), { signal });
    return rutina;
  },
  createRoutine: (input) => http.post(base, input),
  updateRoutine: ({ rutinaId, ...input }) => http.put(route(rutinaId), input),
  deleteRoutine: (id) => http.del(route(id)),
  archiveRoutine: (id, archivada) => http.patch(`${route(id)}/estado`, { archivada }),
  startRoutine: (id, sessionId) => http.post(`${route(id)}/iniciar`, { id: sessionId }),
};

export default routinesApi;
