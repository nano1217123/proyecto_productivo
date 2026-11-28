"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { crearDescargaResenas } from "../../reviews/api/reviewsReportApi.js";
import { BotonesDescarga } from "../../reports/ReportActions.jsx";

import { obtenerReportePersonal } from "../api/reportesPersonalesApi.js";

export default function ReportesPersonales() {
  const [descarga] = useState(() => crearDescargaResenas({ obtener: obtenerReportePersonal }));
  const [tipo, setTipo] = useState("progreso");
  const [estado, actualizar] = useState(null);
  useEffect(() => descarga.cancelar, [descarga]);
  const ocupado = estado?.estado === "cargando";
  return (
    <section className="my-6 rounded-xl border border-[#41433f] p-4">
      <h2 className="mb-3 text-lg font-bold">Mis reportes</h2>
      <form className="flex flex-wrap items-end gap-3" aria-busy={ocupado} onSubmit={evento => {
        evento.preventDefault();
        const campos = new FormData(evento.currentTarget);
        descarga.iniciar({
          tipo: campos.get("tipo"), desde: campos.get("desde"), hasta: campos.get("hasta"),
          formato: evento.nativeEvent.submitter?.value || "csv",
        }, actualizar);
      }}>
        <label className="grid gap-1">Reporte
          <select name="tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value)} className="rounded bg-[#212320] p-2" disabled={ocupado}>
            <option value="progreso">Progreso físico</option>
            <option value="rutinas">Rutinas</option>
            <option value="ejercicios">Ejercicios realizados</option>
          </select>
        </label>
        <label className="grid gap-1">Desde<input className="rounded bg-[#212320] p-2" type="date" name="desde" disabled={ocupado} /></label>
        <label className="grid gap-1">Hasta<input className="rounded bg-[#212320] p-2" type="date" name="hasta" disabled={ocupado} /></label>
        <BotonesDescarga cargando={ocupado} />
      </form>
      {tipo === "progreso" && <Link href="/dashboard/entrenamientos/progreso#vista-previa-progreso" className="mt-4 inline-block text-sm font-bold text-[#d7adff] underline">Ver progreso por ejercicio</Link>}
      <p role={estado?.estado === "error" ? "alert" : "status"} className="mt-2 text-sm">
        {ocupado ? "Preparando el reporte." : estado?.mensaje}
      </p>
    </section>
  );
}
