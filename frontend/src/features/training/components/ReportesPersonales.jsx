"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useState } from "react";
import { crearDescargaResenas } from "../../reviews/api/reviewsReportApi.js";
import { BotonesDescarga, EstadoDescarga, FechasReporte, campoReporte, panelReporte } from "../../reports/ReportActions.jsx";

import { obtenerReportePersonal } from "../api/reportesPersonalesApi.js";
import { HomeIcon } from "../../dashboard/components/HomePanel.jsx";

const tipos = [
  ["progreso", "Progreso físico", "trend"],
  ["rutinas", "Rutinas", "training"],
  ["ejercicios", "Ejercicios realizados", "routine"],
];

export default function ReportesPersonales({ enCentro = false }) {
  const id = useId();
  const [descarga] = useState(() => crearDescargaResenas({ obtener: obtenerReportePersonal }));
  const [tipo, setTipo] = useState("progreso");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estado, actualizar] = useState(null);
  useLayoutEffect(() => descarga.cancelar, [descarga]);
  const ocupado = estado?.estado === "cargando";
  return (
    <section aria-labelledby={id} className={panelReporte}>
      {enCentro ? <header className="reports-panel-heading">
        <span className="reports-panel-icon"><HomeIcon name="routine" /></span>
        <div><h2 id={id}>Exportar reporte personal</h2>
          <p>Descarga información de tu entrenamiento y progreso.</p></div>
      </header> : <h2 id={id} className="text-2xl font-bold">Mis reportes</h2>}
      <form className="mt-4" aria-busy={ocupado} onSubmit={evento => {
        evento.preventDefault();
        const campos = new FormData(evento.currentTarget);
        descarga.iniciar({
          tipo: campos.get("tipo"), desde: campos.get("desde"), hasta: campos.get("hasta"),
          formato: evento.nativeEvent.submitter?.value || "csv",
        }, actualizar);
      }}>
        {enCentro ? <fieldset className="reports-types">
          <legend>Tipo de reporte personal</legend>
          <div>
            {tipos.map(([valor, nombre, icono]) => (
              <label key={valor}>
                <HomeIcon name={icono} />
                <span>{nombre}</span>
                <input type="radio" name="tipo" value={valor} checked={tipo === valor}
                  onChange={() => setTipo(valor)} disabled={ocupado} />
              </label>
            ))}
          </div>
        </fieldset> : <label className="grid gap-1 text-sm sm:max-w-sm">Tipo de reporte personal
          <select name="tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value)} className={campoReporte} disabled={ocupado}>
            {tipos.map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
        </label>}
        <FechasReporte {...{ desde, hasta, setDesde, setHasta }} disabled={ocupado} />
        <BotonesDescarga cargando={ocupado} />
      </form>
      <div className="mt-3"><EstadoDescarga resultado={estado} /></div>
      {tipo === "progreso" && <Link href="/dashboard/entrenamientos/progreso#vista-previa-progreso" className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-bold text-[var(--lime)] underline focus-visible:outline-2 focus-visible:outline-offset-2">Ver progreso por ejercicio</Link>}
    </section>
  );
}
