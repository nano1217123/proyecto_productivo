"use client";

import { useEffect, useState } from "react";
import { crearDescargaResenas } from "../../reviews/api/reviewsReportApi.js";

async function obtener({ tipo, formato, desde, hasta, signal }) {
  if (desde && hasta && desde > hasta) throw new Error("La fecha inicial debe preceder a la final.");
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  const mime = formato === "pdf" ? "application/pdf" : "text/csv";
  const respuesta = await fetch(`/api/reportes/personales/${tipo}.${formato}?${parametros}`, {
    credentials: "include", headers: { Accept: mime }, signal,
  });
  if (respuesta.status === 401) throw new Error("Vuelve a iniciar sesión.");
  if (respuesta.status === 422) throw new Error("Reduce el rango de fechas.");
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

export default function ReportesPersonales() {
  const [descarga] = useState(() => crearDescargaResenas({ obtener }));
  const [estado, actualizar] = useState(null);
  useEffect(() => descarga.cancelar, [descarga]);
  const ocupado = estado?.estado === "cargando";
  return (
    <section className="my-6 rounded-xl border border-[#41433f] p-4">
      <h2 className="mb-3 text-lg font-bold">Descargar mis reportes</h2>
      <form className="flex flex-wrap items-end gap-3" aria-busy={ocupado} onSubmit={evento => {
        evento.preventDefault();
        const campos = new FormData(evento.currentTarget);
        descarga.iniciar({
          tipo: campos.get("tipo"), desde: campos.get("desde"), hasta: campos.get("hasta"),
          formato: evento.nativeEvent.submitter?.value || "csv",
        }, actualizar);
      }}>
        <label className="grid gap-1">Reporte
          <select name="tipo" className="rounded bg-[#212320] p-2" disabled={ocupado}>
            <option value="progreso">Progreso físico</option>
            <option value="rutinas">Rutinas</option>
            <option value="ejercicios">Ejercicios realizados</option>
          </select>
        </label>
        <label className="grid gap-1">Desde<input className="rounded bg-[#212320] p-2" type="date" name="desde" disabled={ocupado} /></label>
        <label className="grid gap-1">Hasta<input className="rounded bg-[#212320] p-2" type="date" name="hasta" disabled={ocupado} /></label>
        {["csv", "pdf"].map(formato => (
          <button key={formato} value={formato} type="submit" disabled={ocupado}
            className="rounded bg-[#b56cff] px-3 py-2 font-bold text-[#151714] disabled:opacity-60">
            Descargar {formato.toUpperCase()}
          </button>
        ))}
      </form>
      <p role={estado?.estado === "error" ? "alert" : "status"} className="mt-2 text-sm">
        {ocupado ? "Preparando el reporte." : estado?.mensaje}
      </p>
    </section>
  );
}
