"use client";

import { claveSedeAdmin, leerSedeAdmin } from "@/src/features/admin/hooks/useAdminDashboard";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import ReportesPersonales from "@/src/features/training/components/ReportesPersonales";
import ReviewsReportTab from "@/src/features/reviews/components/ReviewsReportTab";
import { accesoReportes } from "./reportAccess.js";
import { campoReporte, panelReporte } from "./ReportActions.jsx";
import { HomeIcon } from "../dashboard/components/HomePanel.jsx";

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
  ["personales", "Mis reportes", "Progreso, rutinas y ejercicios", "routine"],
  ["resenas", "Reseñas", "Opiniones y calificaciones por sede", "reviews"],
  ["membresias", "Membresías", "Vínculos actuales por sede", "card"],
];

function ReportesDisponibles({ perfil, gym, permisos }) {
  const [categoria, setCategoria] = useState(gym && permisos.resenas ? "resenas" : "personales");
  return <div className="reports-grid">
    <section className="reports-categories" aria-labelledby="reports-categories-title">
      <h2 id="reports-categories-title">Categoría de reporte</h2>
      <div role="group" aria-labelledby="reports-categories-title">
        {(permisos.resenas ? categorias : categorias.slice(0, 1)).map(([valor, etiqueta, detalle, icono]) => (
          <button key={valor} type="button" aria-label={etiqueta} aria-pressed={categoria === valor}
            onClick={() => setCategoria(valor)} className="reports-category">
            <HomeIcon name={icono} />
            <span><strong>{etiqueta}</strong><small>{detalle}</small></span>
          </button>
        ))}
      </div>
    </section>
    {categoria === "personales" || !permisos.resenas ? <ReportesPersonales enCentro /> :
      <ReportePorSede key={categoria} perfil={perfil} desdePanel={gym} membresias={categoria === "membresias"} />}
  </div>;
}

export default function CentroReportes({ gym }) {
  const { profile, loading } = useAuth();
  const permisos = accesoReportes(profile);
  return (
    <main className="reports-center">
      <div className="reports-shell">
        <header className="reports-header">
          <h1>Centro de reportes</h1>
          <p>Configura y descarga reportes {permisos.resenas ? "de tu actividad, reseñas o membresías." : "de tu actividad."}</p>
        </header>
        {loading ? <p className={panelReporte} role="status">Cargando permisos de reportes…</p>
          : !permisos.personales ? <p className={panelReporte} role="status">Necesitas una sesión habilitada para consultar reportes.</p>
          : <ReportesDisponibles key={JSON.stringify([profile.idusuario, profile.tipo_usuario, gym])}
              perfil={profile} gym={gym} permisos={permisos} />}
      </div>
    </main>
  );
}
