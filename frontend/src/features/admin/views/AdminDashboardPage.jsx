"use client";

import { useAuth } from "@/src/features/auth/context/AuthContext";
import AdminHeader from "../components/AdminHeader";
import AdminTabs from "../components/AdminTabs";
import ImagesTab from "../components/ImagesTab";
import CommunicationTab from "../components/CommunicationTab";
import ConfigTab from "../components/ConfigTab";
import CreateAdminTab from "../components/CreateAdminTab";
import ClientesSedeTab from "../components/ClientesSedeTab";
import SubscriptionTab from "../components/SubscriptionTab";
import { useEffect } from "react";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import { useAdminDashboard } from "../hooks/useAdminDashboard";

export default function AdminDashboardPage() {
  const dashboard = useAdminDashboard();
  const { profile } = useAuth();
  const esAdmin = profile?.tipo_usuario === "admin";
  const { sedes, nombreSede, sede, error: errorSedes } = useSedes();
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

  return (
    <div className="w-full max-w-[1060px] mx-auto px-6 pt-10 pb-20">
      <AdminHeader 
        gymSeleccionado={dashboard.gymSeleccionado} 
        setGymSeleccionado={dashboard.setGymSeleccionado} 
        gimnasios={gimnasios} 
        logout={dashboard.logout} 
      />

      <AdminTabs 
        tabActiva={dashboard.tabActiva} 
        setTabActiva={dashboard.setTabActiva} 
        esSuperAdmin={dashboard.esSuperAdmin} 
        esAdmin={esAdmin}
      />

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
        <CommunicationTab nombreSede={gymSeleccionado ? nombreSede(gymSeleccionado) : null} />
      )}

      {dashboard.tabActiva === "configuracion" && (
        <ConfigTab
          gymSlug={gymSeleccionado}
          sede={gymSeleccionado ? sede(gymSeleccionado) : null}
          errorSedes={errorSedes}
        />
      )}

      {dashboard.tabActiva === "clientes" && (
        <ClientesSedeTab gymSlug={gymSeleccionado} esSuperAdmin={dashboard.esSuperAdmin} />
      )}

      {dashboard.tabActiva === "crear-admin" && dashboard.esSuperAdmin && <CreateAdminTab />}

      {dashboard.tabActiva === "suscripcion" && esAdmin && <SubscriptionTab />}
    </div>
  );
}
