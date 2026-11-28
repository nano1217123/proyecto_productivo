"use client";

import { claveSedeAdmin, leerSedeAdmin } from "@/src/features/admin/hooks/useAdminDashboard";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import ReportesPersonales from "@/src/features/training/components/ReportesPersonales";
import ReviewsReportTab from "@/src/features/reviews/components/ReviewsReportTab";
import { accesoReportes } from "./reportAccess.js";
import { campoReporte, panelReporte } from "./ReportActions.jsx";

function ReportePorSede({ perfil, desdePanel, membresias = false }) {
  const { sedes, nombreSede, error, cargando } = useSedes();
  const permisos = accesoReportes(perfil, sedes);
  const clave = claveSedeAdmin(perfil);
  const [preferida, setPreferida] = useState(desdePanel ?? "");
  useEffect(() => {
    if (desdePanel == null) setPreferida(leerSedeAdmin(clave) ?? "");
  }, [clave, desdePanel]);
  const [alcance, setAlcance] = useState("sede");
  const seleccionada = permisos.sedes.includes(preferida) ? preferida : permisos.sedes[0];
  const sede = seleccionada ? { id: seleccionada, nombre: nombreSede(seleccionada) } : undefined;
  const selectorSede = sede && (
    <label className="grid min-w-0 gap-1 text-sm">Sede del reporte
      <select value={seleccionada} onChange={event => setPreferida(event.target.value)} className={campoReporte}>
        {permisos.sedes.map(slug => <option key={slug} value={slug}>{nombreSede(slug)}</option>)}
      </select>
    </label>
  );
  return (
    <ReviewsReportTab sede={sede} selectorSede={selectorSede} errorSedes={error} cargandoSedes={cargando}
      esSuperAdmin={permisos.consolidado} membresias={membresias} alcance={alcance} setAlcance={setAlcance} />
  );
}

const categorias = [
  ["personales", "Personales"],
  ["resenas", "Reseñas"],
  ["membresias", "Membresías"],
];

function ReportesDisponibles({ perfil, gym, permisos }) {
  const [categoria, setCategoria] = useState(gym && permisos.resenas ? "resenas" : "personales");
  return <>
    {permisos.resenas && (
      <div role="group" aria-label="Categorías de reportes" className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {categorias.map(([valor, etiqueta]) => (
          <button key={valor} type="button" aria-pressed={categoria === valor} onClick={() => setCategoria(valor)}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 font-semibold hover:border-[var(--lime)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lime)] aria-pressed:border-[var(--lime)] aria-pressed:bg-[var(--green-soft)] aria-pressed:text-[var(--lime)]">
            {etiqueta}
          </button>
        ))}
      </div>
    )}
    {categoria === "personales" || !permisos.resenas ? <ReportesPersonales /> :
      <ReportePorSede key={categoria} perfil={perfil} desdePanel={gym} membresias={categoria === "membresias"} />}
  </>;
}

export default function CentroReportes({ gym }) {
  const { profile, loading } = useAuth();
  const permisos = accesoReportes(profile);
  return (
    <main className="px-4 py-6 text-[var(--ink)] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-6 border-b border-[var(--line)] pb-4">
          <h1 className="text-3xl font-bold text-[var(--lime)] sm:text-4xl">Centro de reportes</h1>
        </header>
        {loading ? <p className={panelReporte} role="status">Cargando permisos de reportes…</p>
          : !permisos.personales ? <p className={panelReporte} role="status">Necesitas una sesión habilitada para consultar reportes.</p>
          : <ReportesDisponibles key={JSON.stringify([profile.idusuario, profile.tipo_usuario, gym])}
              perfil={profile} gym={gym} permisos={permisos} />}
      </div>
    </main>
  );
}
