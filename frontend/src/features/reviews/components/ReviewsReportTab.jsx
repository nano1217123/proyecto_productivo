"use client";

import { useId, useLayoutEffect, useState } from "react";
import { crearDescargaResenas, obtenerReporteMembresias } from "../api/reviewsReportApi.js";
import { BotonesDescarga, EstadoDescarga, FechasReporte, campoReporte, filtrosReporte, panelReporte } from "../../reports/ReportActions.jsx";

export default function ReviewsReportTab({ sede, selectorSede, cargandoSedes, errorSedes, esSuperAdmin, alcance = "sede", setAlcance, membresias = false }) {
  const id = useId();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [resultado, setResultado] = useState(null);
  const [descarga] = useState(() => crearDescargaResenas(membresias ? { obtener: obtenerReporteMembresias } : undefined));
  const gymSlug = sede?.id;
  const consolidado = esSuperAdmin && alcance === "consolidado";
  const habilitado = Boolean(consolidado || gymSlug);
  const cargando = resultado?.estado === "cargando";

  useLayoutEffect(() => {
    setResultado(null);
    return descarga.cancelar;
  }, [descarga, gymSlug, consolidado]);

  function descargar(evento) {
    evento.preventDefault();
    if (!habilitado) return;
    const formato = evento.nativeEvent.submitter?.value || "csv";
    descarga.iniciar({ gymSlug, desde, hasta, formato, alcance: consolidado ? "consolidado" : "sede" }, setResultado);
  }

  return (
    <section aria-labelledby={id + "-titulo"} className={panelReporte}>
      <h2 id={id + "-titulo"} className="text-2xl font-bold">{membresias ? "Reportes de membresías" : "Reportes de reseñas"}</h2>
      {membresias && <p className="mt-2 text-sm text-[var(--muted)]">
        Incluye vínculos actuales. Las fechas filtran el día de vinculación en Bogotá.
      </p>}
      {(esSuperAdmin || selectorSede) && (
        <div className={"mt-4 " + filtrosReporte}>
          {esSuperAdmin && (
            <div className="grid min-w-0 gap-1 text-sm">
              <label htmlFor={id + "-alcance"}>Alcance</label>
              <select id={id + "-alcance"} value={alcance} onChange={(e) => setAlcance(e.target.value)}
                className={campoReporte}>
                <option value="sede">Gimnasio específico</option>
                <option value="consolidado">Consolidado</option>
              </select>
            </div>
          )}
          {!consolidado && selectorSede}
        </div>
      )}
      <p className="mt-3 text-sm text-[var(--muted)]" role={!habilitado && errorSedes ? "alert" : "status"}>
        {consolidado ? "Todas las sedes vigentes." : sede ? `Sede seleccionada: ${sede.nombre}` : cargandoSedes ? "Cargando sedes…" :
          errorSedes ? "No se pudo cargar el catálogo de sedes." : "No hay una sede disponible para descargar el reporte."}
      </p>
      <form onSubmit={descargar} aria-busy={cargando}>
        <FechasReporte {...{ desde, hasta, setDesde, setHasta }} disabled={!habilitado || cargando} />
        <BotonesDescarga disabled={!habilitado} cargando={cargando} />
      </form>
      <div className="mt-3"><EstadoDescarga resultado={resultado} /></div>
    </section>
  );
}
