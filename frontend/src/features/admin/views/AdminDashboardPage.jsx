"use client";

import { useAuth } from "@/src/features/auth/context/AuthContext";
import AdminHeader from "../components/AdminHeader";
import AdminTabs from "../components/AdminTabs";
import ImagesTab from "../components/ImagesTab";
import ConfigTab from "../components/ConfigTab";
import CreateAdminTab from "../components/CreateAdminTab";
import ClientesSedeTab from "../components/ClientesSedeTab";
import SubscriptionTab from "../components/SubscriptionTab";
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
  const gymSeleccionado = gimnasios.find(({ id }) => id === dashboard.gymSeleccionado)?.id ?? gimnasios[0]?.id ?? null;

  return (
    <main className="mx-auto w-full max-w-[1060px] px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <AdminHeader
        general={dashboard.esSuperAdmin}
        alcance={dashboard.tabActiva === "imagenes" ? "Catálogo compartido entre sedes" :
          dashboard.tabActiva === "crear-admin" ? "Asignación por sede" :
          dashboard.tabActiva === "suscripcion" ? "Facturación por cada sede administrada" :
          gymSeleccionado ? nombreSede(gymSeleccionado) : "Sin sede seleccionada"}
        gymSeleccionado={gymSeleccionado}
        setGymSeleccionado={dashboard.setGymSeleccionado} 
        gimnasios={gimnasios} 
      />

      <AdminTabs 
        tabActiva={dashboard.tabActiva} 
        setTabActiva={dashboard.setTabActiva} 
        esSuperAdmin={dashboard.esSuperAdmin} 
        esAdmin={esAdmin}
      />

      {dashboard.tabActiva === "imagenes" && (
        // El catálogo de imágenes es compartido: no depende de la sede elegida.
        <ImagesTab />
      )}

      {dashboard.tabActiva === "configuracion" && (
        <ConfigTab
          gymSlug={gymSeleccionado}
          sede={gymSeleccionado ? sede(gymSeleccionado) : null}
          errorSedes={errorSedes}
        />
      )}

      {dashboard.tabActiva === "clientes" && (
        <ClientesSedeTab key={gymSeleccionado ?? "sin-sede"} gymSlug={gymSeleccionado} esSuperAdmin={dashboard.esSuperAdmin} />
      )}

      {dashboard.tabActiva === "crear-admin" && dashboard.esSuperAdmin && <CreateAdminTab />}

      {dashboard.tabActiva === "suscripcion" && esAdmin && <SubscriptionTab />}
    </main>
  );
}
