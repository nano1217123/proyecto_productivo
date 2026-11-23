"use client";

import AdminHeader from "../components/AdminHeader";
import AdminTabs from "../components/AdminTabs";
import MembersTab from "../components/MembersTab";
import ImagesTab from "../components/ImagesTab";
import CommunicationTab from "../components/CommunicationTab";
import ConfigTab from "../components/ConfigTab";
import CreateAdminTab from "../components/CreateAdminTab";
import { useMembersFilter } from "../hooks/useMembersFilter";
import { useAdminDashboard } from "../hooks/useAdminDashboard";

const GIMNASIOS = [
  { id: "jj-poblado", nombre: "JJ GYM El Poblado" },
  { id: "power-laureles", nombre: "Power Laureles" },
  { id: "fit-belen", nombre: "Fit Lab Belén" },
];

export default function AdminDashboardPage() {
  const dashboard = useAdminDashboard();
  const { miembrosFiltrados, proximosAVencer, busqueda, setBusqueda, filtroEstado, setFiltroEstado } = useMembersFilter(dashboard.miembros);

  return (
    <div className="w-full max-w-[1060px] mx-auto px-6 pt-10 pb-20">
      <AdminHeader 
        gymSeleccionado={dashboard.gymSeleccionado} 
        setGymSeleccionado={dashboard.setGymSeleccionado} 
        gimnasios={GIMNASIOS} 
        logout={dashboard.logout} 
      />

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

      {dashboard.tabActiva === "crear-admin" && dashboard.esSuperAdmin && (
        <CreateAdminTab
          errorCrearAdmin={dashboard.errorCrearAdmin} exitoCrearAdmin={dashboard.exitoCrearAdmin}
          nuevoAdmin={dashboard.nuevoAdmin} setNuevoAdmin={dashboard.setNuevoAdmin}
          crearAdministrador={dashboard.crearAdministrador} creandoAdmin={dashboard.creandoAdmin}
        />
      )}
    </div>
  );
}
