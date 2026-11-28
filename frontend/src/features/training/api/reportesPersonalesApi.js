import { sessionFetch } from "../../../lib/api/sessionFetch.js";
export async function obtenerReportePersonal({ tipo, formato, desde, hasta, signal }) {
  if (desde && hasta && desde > hasta) throw new Error("La fecha inicial debe preceder a la final.");
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  const mime = formato === "pdf" ? "application/pdf" : "text/csv";
  const respuesta = await sessionFetch(`/api/reportes/personales/${tipo}.${formato}?${parametros}`, {
    credentials: "include", headers: { Accept: mime }, signal,
  });
  if (respuesta.status === 401) throw new Error("Vuelve a iniciar sesión.");
  if (respuesta.status === 422) {
    const resultado = await respuesta.json().catch(() => null);
    signal.throwIfAborted();
    throw new Error(typeof resultado?.message === "string" && resultado.message
      ? resultado.message : "No se pudo generar el reporte para este período.");
  }
  if (respuesta.status === 429) throw new Error("Espera un momento antes de descargar de nuevo.");
  if (respuesta.status !== 200 || respuesta.headers.get("content-type")?.split(";")[0] !== mime) {
    throw new Error("No se pudo descargar el reporte.");
  }
  const datos = await respuesta.arrayBuffer();
  signal.throwIfAborted();
  if (!datos.byteLength || (formato === "pdf" && new TextDecoder().decode(datos.slice(0, 5)) !== "%PDF-")) {
    throw new Error("El reporte está vacío o tiene un formato inválido.");
  }
  return { blob: new Blob([datos], { type: mime }), nombre: `${tipo}.${formato}` };
}
