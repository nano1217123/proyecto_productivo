"use client";

import { claveSedeAdmin } from "@/src/features/admin/hooks/useAdminDashboard";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import ReportesPersonales from "@/src/features/training/components/ReportesPersonales";
import ReviewsReportTab from "@/src/features/reviews/components/ReviewsReportTab";
import { accesoReportes } from "./reportAccess.js";
import { enlaceReporte } from "./ReportActions.jsx";

function ReportePorSede({ perfil, desdePanel, membresias = false }) {
  const { sedes, nombreSede, error } = useSedes();
  const permisos = accesoReportes(perfil, sedes);
  const clave = claveSedeAdmin(perfil);
  const [preferida, setPreferida] = useState(desdePanel ?? "");
  useEffect(() => {
    if (!desdePanel) {
      try { setPreferida(sessionStorage.getItem(clave) ?? ""); } catch { /* sin almacenamiento */ }
    } else setPreferida(desdePanel);
  }, [clave, desdePanel]);
  const [alcance, setAlcance] = useState("sede");
  const seleccionada = permisos.sedes.includes(preferida) ? preferida : permisos.sedes[0];
  const sede = seleccionada ? { id: seleccionada, nombre: nombreSede(seleccionada) } : undefined;
  return (
    <div className="rounded-2xl border border-[#41433f] bg-[var(--surface)] p-4 sm:p-6">
      {alcance === "sede" && permisos.sedes.length > 0 && (
        <label className="mb-4 flex flex-wrap items-center gap-3 text-sm">Sede del reporte
          <select value={seleccionada} onChange={event => setPreferida(event.target.value)}
            className="rounded-lg border border-[#41463f] bg-[#151714] px-3 py-2 focus-visible:outline-2 focus-visible:outline-[var(--lime)]">
            {permisos.sedes.map(slug => <option key={slug} value={slug}>{nombreSede(slug)}</option>)}
          </select>
        </label>
      )}
      <ReviewsReportTab sede={sede} errorSedes={error} esSuperAdmin={permisos.consolidado} membresias={membresias}
        alcance={alcance} setAlcance={setAlcance} />
    </div>
  );
}

export default function CentroReportes({ gym }) {
  const { profile, loading } = useAuth();
  const permisos = accesoReportes(profile);
  return (
    <main className="min-h-screen bg-[#171817] px-5 py-8 text-[var(--ink)]">
      <div className="mx-auto max-w-5xl">
        <header className="my-7 border-b border-[var(--green-soft)] pb-5">
          <h1 className="text-3xl font-bold text-[var(--lime)] sm:text-4xl">Centro de reportes</h1>
        </header>
        {loading ? <p role="status">Cargando permisos de reportes…</p>
          : !permisos.personales ? <p role="status">Necesitas una sesión habilitada para consultar reportes.</p>
          : <>
            <ReportesPersonales key={profile.idusuario ?? profile.tipo_usuario} />
            <Link href="/dashboard/entrenamientos/historial#vista-previa-progreso" className={enlaceReporte + " mb-6"}>
              Vista previa de progreso
            </Link>
            {permisos.resenas && <div className="grid gap-5" key={profile.idusuario + ":" + profile.tipo_usuario}>
              <ReportePorSede perfil={profile} desdePanel={gym} />
              <ReportePorSede perfil={profile} desdePanel={gym} membresias />
            </div>}
          </>}
      </div>
    </main>
  );
}
