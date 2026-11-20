import httpClient from "@/lib/api/httpClient";

export const guardarMetricasHoy = async (datos) => {
  try {
    return await httpClient.post("/api/particular/metrics", datos);
  } catch (error) {
    if (error?.status === 404) {
      return await httpClient.post("/particular/metrics", datos);
    }
    throw error;
  }
};

export const obtenerMetricasHoy = async () => {
  try {
    return await httpClient.get("/api/particular/metrics/hoy");
  } catch (error) {
    if (error?.status === 404) {
      return await httpClient.get("/particular/metrics/hoy");
    }
    throw error;
  }
};

export const particularApi = {
  guardarMetricasHoy,
  obtenerMetricasHoy,
};

export default particularApi;
