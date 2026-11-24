"use client";

import Link from "next/link";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import AdminHeader from "../components/AdminHeader";
import AdminTabs from "../components/AdminTabs";
import MembersTab from "../components/MembersTab";
import ImagesTab from "../components/ImagesTab";
import CommunicationTab from "../components/CommunicationTab";
import ConfigTab from "../components/ConfigTab";
import CreateAdminTab from "../components/CreateAdminTab";
import ClientesSedeTab from "../components/ClientesSedeTab";
import { useEffect } from "react";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import { useMembersFilter } from "../hooks/useMembersFilter";
import { useAdminDashboard } from "../hooks/useAdminDashboard";

export default function AdminDashboardPage() {
  const dashboard = useAdminDashboard();
  const { profile } = useAuth();
  const { sedes, nombreSede } = useSedes();
  // Sedes del panel según el servidor: las del admin (admin_sedes) o todo
  // el catálogo para el super_admin.
  const gimnasios = (dashboard.esSuperAdmin
    ? sedes.map((s) => s.slug)
    : profile?.sedes_administradas ?? []
  ).map((slug) => ({ id: slug, nombre: nombreSede(slug) }));
  const idsSedes = gimnasios.map((g) => g.id).join(",");
  const { gymSeleccionado, setGymSeleccionado } = dashboard;

  useEffect(() => {
    const ids = idsSedes ? idsSedes.split(",") : [];
    if (!ids.includes(gymSeleccionado)) setGymSeleccionado(ids[0] ?? null);
  }, [idsSedes, gymSeleccionado, setGymSeleccionado]);
  const { miembrosFiltrados, proximosAVencer, busqueda, setBusqueda, filtroEstado, setFiltroEstado } = useMembersFilter(dashboard.miembros);

  return (
    <div className="w-full max-w-[1060px] mx-auto px-6 pt-10 pb-20">
      <AdminHeader 
        gymSeleccionado={dashboard.gymSeleccionado} 
        setGymSeleccionado={dashboard.setGymSeleccionado} 
        gimnasios={gimnasios} 
        logout={dashboard.logout} 
      />

      {/* Pagos: solo el admin de sede paga su suscripción (no super_admin). */}
      {profile?.tipo_usuario === "admin" && (
        <Link
          href="/dashboard/pagos"
          className="inline-block mb-6 px-3.5 py-2 rounded-md border border-[#b56cff] text-[#d7adff] text-sm font-bold no-underline hover:bg-[rgba(181,108,255,.12)]"
        >
          Pagar suscripción de la sede
        </Link>
      )}

      <AdminTabs 
        tabActiva={dashboard.tabActiva} 
        setTabActiva={dashboard.setTabActiva} 
        esSuperAdmin={dashboard.esSuperAdmin} 
      />

      {dashboard.tabActiva === "miembros" && (
        <MembersTab
          miembros={dashboard.miembros}
          miembrosFiltrados={miembrosFiltrados}
          proximosAVencer={proximosAVencer}
          busqueda={busqueda} setBusqueda={setBusqueda}
          filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
          renovarSuscripcion={dashboard.renovarSuscripcion}
          cambiarEstadoMiembro={dashboard.cambiarEstadoMiembro}
          errorImagen={dashboard.errorImagen} urlImagen={dashboard.urlImagen}
          subirImagen={dashboard.subirImagen} setImagenFile={dashboard.setImagenFile}
          subiendoImagen={dashboard.subiendoImagen} imagenFile={dashboard.imagenFile}
          asignarImagenAEjercicio={dashboard.asignarImagenAEjercicio}
          ejercicioId={dashboard.ejercicioId} setEjercicioId={dashboard.setEjercicioId}
          mensajeAsignacion={dashboard.mensajeAsignacion}
        />
      )}

      {dashboard.tabActiva === "imagenes" && (
        <ImagesTab
          errorImagen={dashboard.errorImagen} urlImagen={dashboard.urlImagen}
          subirImagen={dashboard.subirImagen} setImagenFile={dashboard.setImagenFile}
          subiendoImagen={dashboard.subiendoImagen} imagenFile={dashboard.imagenFile}
          asignarImagenAEjercicio={dashboard.asignarImagenAEjercicio}
          ejercicioId={dashboard.ejercicioId} setEjercicioId={dashboard.setEjercicioId}
          mensajeAsignacion={dashboard.mensajeAsignacion}
        />
      )}

      {dashboard.tabActiva === "comunicacion" && (
        <CommunicationTab
          correoTarget={dashboard.correoTarget} setCorreoTarget={dashboard.setCorreoTarget}
          asuntoCorreo={dashboard.asuntoCorreo} setAsuntoCorreo={dashboard.setAsuntoCorreo}
          mensajeCorreo={dashboard.mensajeCorreo} setMensajeCorreo={dashboard.setMensajeCorreo}
          enviandoCorreo={dashboard.enviandoCorreo} enviarAnuncio={dashboard.enviarAnuncio}
        />
      )}

      {dashboard.tabActiva === "configuracion" && (
        <ConfigTab
          sedeInfo={dashboard.sedeInfo} setSedeInfo={dashboard.setSedeInfo}
          guardandoSede={dashboard.guardandoSede} guardarConfiguracion={dashboard.guardarConfiguracion}
        />
      )}

      {dashboard.tabActiva === "clientes" && (
        <ClientesSedeTab gymSlug={gymSeleccionado} esSuperAdmin={dashboard.esSuperAdmin} />
      )}

      {dashboard.tabActiva === "crear-admin" && dashboard.esSuperAdmin && <CreateAdminTab />}
    </div>
  );
}
