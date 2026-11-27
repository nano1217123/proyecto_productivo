import { HttpError } from "../../../lib/api/httpClient.js";

const mensajes = {
  400: "Revisa las fechas del reporte.",
  401: "Tu sesión venció. Vuelve a iniciar sesión.",
  403: "Ya no tienes permiso para descargar reseñas de esta sede.",
  404: "La sede seleccionada no está disponible.",
  422: "El reporte es demasiado grande. Acota el rango de fechas.",
  429: "Alcanzaste el límite de descargas. Intenta de nuevo en un minuto.",
};

function fechaValida(valor) {
  if (valor === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith("0000-")) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function nombreSeguro(cabecera, gymSlug) {
  const extendido = /(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]+)/i.exec(cabecera)?.[1];
  const simple = /(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/i.exec(cabecera);
  let decodificado;
  if (extendido) {
    try { decodificado = decodeURIComponent(extendido.trim()); } catch { /* nombre inválido */ }
  }
  for (const nombre of [decodificado, simple?.[1] ?? simple?.[2]]) {
    if (nombre && nombre === nombre.trim() && /^[a-z0-9][a-z0-9_-]{0,119}\.csv$/i.test(nombre)
      && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])\.csv$/i.test(nombre)) return nombre;
  }
  const sede = gymSlug.replace(/[^a-z0-9-]/gi, "-").slice(0, 80);
  return `resenas-${sede || "sede"}.csv`;
}

export async function obtenerReporteResenas({ gymSlug, desde = "", hasta = "", signal }) {
  if (!gymSlug) throw new HttpError("Selecciona una sede para descargar el reporte.");
  if (!fechaValida(desde) || !fechaValida(hasta)) {
    throw new HttpError("Ingresa fechas válidas en formato AAAA-MM-DD.", { status: 400 });
  }
  if (desde && hasta && desde > hasta) {
    throw new HttpError("La fecha inicial debe ser anterior o igual a la fecha final.", { status: 400 });
  }

  const filtros = new URLSearchParams();
  if (desde) filtros.set("desde", desde);
  if (hasta) filtros.set("hasta", hasta);
  const query = filtros.toString();
  const url = `/api/resenas/gimnasio/${encodeURIComponent(gymSlug)}/reporte.csv${query ? "?" + query : ""}`;
  let respuesta;
  try {
    respuesta = await fetch(url, { credentials: "include", signal, headers: { Accept: "text/csv" } });
    if (!respuesta.ok) {
      const body = await respuesta.json().catch(() => null);
      throw new HttpError(mensajes[respuesta.status] ?? "No se pudo descargar el reporte. Intenta de nuevo.",
        { status: respuesta.status, body, url });
    }
    if (respuesta.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "text/csv") {
      throw new HttpError("El servidor no devolvió un archivo CSV.", { status: respuesta.status, url });
    }
    return {
      blob: await respuesta.blob(),
      nombre: nombreSeguro(respuesta.headers.get("content-disposition") ?? "", gymSlug),
    };
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError" || error instanceof HttpError) throw error;
    throw new HttpError("No se pudo completar la descarga. Verifica tu conexión.", { url });
  }
}

function guardarArchivo({ blob, nombre }) {
  const enlace = document.createElement("a");
  const url = URL.createObjectURL(blob);
  try {
    enlace.href = url;
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
  } finally {
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function crearDescargaResenas({ obtener = obtenerReporteResenas, guardar = guardarArchivo } = {}) {
  let activa = null;
  return {
    cancelar() {
      const anterior = activa;
      activa = null;
      anterior?.abort();
    },
    async iniciar(filtros, actualizar) {
      if (activa) return;
      const solicitud = new AbortController();
      activa = solicitud;
      actualizar({ estado: "cargando" });
      try {
        const archivo = await obtener({ ...filtros, signal: solicitud.signal });
        if (activa !== solicitud) return;
        guardar(archivo);
        actualizar({ estado: "exito", mensaje: "Descarga del CSV iniciada." });
      } catch (error) {
        if (activa === solicitud) {
          actualizar({ estado: "error", mensaje: error?.message || "No se pudo descargar el reporte." });
        }
      } finally {
        if (activa === solicitud) activa = null;
      }
    },
  };
}
