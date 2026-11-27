"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import ReportesPersonales from "@/src/features/training/components/ReportesPersonales";
import ReviewsReportTab from "@/src/features/reviews/components/ReviewsReportTab";
import { accesoReportes } from "./reportAccess.js";
import { enlaceReporte, IconoReporte } from "./ReportActions.jsx";

function ResenasAutorizadas({ perfil }) {
  const { sedes, nombreSede, error } = useSedes();
  const permisos = accesoReportes(perfil, sedes);
  const [preferida, setPreferida] = useState("");
  const [alcance, setAlcance] = useState("sede");
  const seleccionada = permisos.sedes.includes(preferida) ? preferida : permisos.sedes[0];
  const sede = seleccionada ? { id: seleccionada, nombre: nombreSede(seleccionada) } : undefined;
  return (
    <div className="rounded-2xl border border-[#4f4a3c] bg-[#24221e] p-4 sm:p-6">
      {alcance === "sede" && permisos.sedes.length > 0 && (
        <label className="mb-4 flex flex-wrap items-center gap-3 text-sm">Sede del reporte
          <select value={seleccionada} onChange={event => setPreferida(event.target.value)}
            className="rounded-lg border border-[#77746c] bg-[#181714] px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#e5c674]">
            {permisos.sedes.map(slug => <option key={slug} value={slug}>{nombreSede(slug)}</option>)}
          </select>
        </label>
      )}
      <ReviewsReportTab sede={sede} errorSedes={error} esSuperAdmin={permisos.consolidado}
        alcance={alcance} setAlcance={setAlcance} />
    </div>
  );
}

export default function CentroReportes() {
  const { profile, loading } = useAuth();
  const permisos = accesoReportes(profile);
  return (
    <main className="min-h-screen bg-[#161512] px-5 py-8 text-[#f1eee5]">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className={enlaceReporte}>Volver al panel</Link>
        <header className="my-7 border-b border-[#806b3e] pb-5">
          <h1 className="text-3xl font-bold text-[#e5c674] sm:text-4xl">Centro de reportes</h1>
        </header>
        {loading ? <p role="status">Cargando permisos de reportes…</p>
          : !permisos.personales ? <p role="status">Necesitas una sesión habilitada para consultar reportes.</p>
          : <>
            <ReportesPersonales key={profile.idusuario ?? profile.tipo_usuario} />
            <Link href="/dashboard/entrenamientos/historial#vista-previa-progreso" className={enlaceReporte + " mb-6"}>
              <IconoReporte tipo="vista" /> Vista previa de progreso
            </Link>
            {permisos.resenas && <ResenasAutorizadas key={profile.idusuario + ":" + profile.tipo_usuario} perfil={profile} />}
          </>}
      </div>
    </main>
  );
}
