"use client";

import { useId, useLayoutEffect, useState } from "react";
import { crearDescargaResenas } from "../api/reviewsReportApi.js";

export default function ReviewsReportTab({ sede, errorSedes }) {
  const id = useId();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [resultado, setResultado] = useState(null);
  const [descarga] = useState(crearDescargaResenas);
  const gymSlug = sede?.id;
  const cargando = resultado?.estado === "cargando";

  useLayoutEffect(() => {
    setResultado(null);
    return descarga.cancelar;
  }, [descarga, gymSlug]);

  function descargar(evento) {
    evento.preventDefault();
    if (!gymSlug) return;
    descarga.iniciar({ gymSlug, desde, hasta }, setResultado);
  }

  return (
    <section aria-labelledby={id + "-titulo"} className="rounded-xl border border-[#41433f] bg-[#212320] p-5">
      <h2 id={id + "-titulo"} className="text-2xl font-bold text-[#f2f4ef]">Reportes de reseñas</h2>
      <p className="mt-2 text-sm text-[#a9afa7]" role="status">
        {sede ? `Sede seleccionada: ${sede.nombre}` :
          errorSedes ? "No se pudo cargar el catálogo de sedes." : "No hay una sede disponible para descargar el reporte."}
      </p>
      <form onSubmit={descargar} aria-busy={cargando} className="mt-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={id + "-desde"} className="text-sm text-[#f2f4ef]">Fecha inicial (opcional)</label>
          <input id={id + "-desde"} type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            disabled={!gymSlug || cargando} className="rounded-md border border-[#41463f] bg-[#151714] px-3 py-2 text-white" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={id + "-hasta"} className="text-sm text-[#f2f4ef]">Fecha final (opcional)</label>
          <input id={id + "-hasta"} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            disabled={!gymSlug || cargando} className="rounded-md border border-[#41463f] bg-[#151714] px-3 py-2 text-white" />
        </div>
        <button type="submit" disabled={!gymSlug || cargando}
          className="rounded-md bg-[#b56cff] px-4 py-2 font-bold text-[#151714] disabled:opacity-50">
          {cargando ? "Descargando…" : "Descargar CSV"}
        </button>
      </form>
      {resultado?.estado === "error" ? (
        <p role="alert" className="mt-3 text-sm text-[#ffabab]">{resultado.mensaje}</p>
      ) : (
        <p role="status" className="mt-3 text-sm text-[#d7adff]">
          {cargando ? "Preparando el archivo CSV." : resultado?.mensaje}
        </p>
      )}
    </section>
  );
}
