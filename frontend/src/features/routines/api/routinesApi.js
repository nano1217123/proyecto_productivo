import { http } from "@/src/lib/api/httpClient";

const base = "/api/rutinas";
const route = (id) => `${base}/${encodeURIComponent(id)}`;

export const routinesApi = {
  async getRoutines(archived = false) {
    const { rutinas } = await http.get(archived ? `${base}?estado=archivadas` : base);
    return rutinas;
  },
  async getRoutineDetail(id) {
    const { rutina } = await http.get(route(id));
    return rutina;
  },
  createRoutine: (input) => http.post(base, input),
  updateRoutine: ({ rutinaId, ...input }) => http.put(route(rutinaId), input),
  deleteRoutine: (id) => http.del(route(id)),
  archiveRoutine: (id, archivada) => http.patch(`${route(id)}/estado`, { archivada }),
  startRoutine: (id, sessionId) => http.post(`${route(id)}/iniciar`, { id: sessionId }),
};

export default routinesApi;
