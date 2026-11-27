import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { PESTANA_INICIAL, restaurarPestana } from "../lib/adminTabs.js";

const CLAVE_PESTANA = "jjgym:admin:pestana";
// «Miembros» se retiró: el plan, el vencimiento y el cobro del alumno se
// gestionan fuera de la plataforma (RN-014). Los clientes reales de cada sede
// están en «Clientes». Una pestaña guardada que ya no existe vuelve a esta.

export function useAdminDashboard() {
  const { logout, profile } = useAuth();
  const esSuperAdmin = profile?.tipo_usuario === "super_admin";
  const esAdmin = profile?.tipo_usuario === "admin";
  
  // Navegación. La pestaña activa se conserva si el panel se vuelve a montar
  // o se recarga la página, siempre que el rol actual pueda verla.
  const [tabActiva, setTabActivaEstado] = useState(PESTANA_INICIAL);
  const setTabActiva = useCallback((tab) => {
    setTabActivaEstado(tab);
    try { sessionStorage.setItem(CLAVE_PESTANA, tab); } catch { /* sin almacenamiento */ }
  }, []);
  useEffect(() => {
    let guardada = null;
    try { guardada = sessionStorage.getItem(CLAVE_PESTANA); } catch { /* sin almacenamiento */ }
    if (guardada) setTabActivaEstado(restaurarPestana(guardada, { esSuperAdmin, esAdmin }));
  }, [esSuperAdmin, esAdmin]);
  // Sede elegida en el panel. Las opciones salen del servidor: las sedes
  // del admin (admin_sedes) o el catálogo completo para el super_admin.
  const [gymSeleccionado, setGymSeleccionado] = useState(null);
  
  return {
    logout, esSuperAdmin,
    tabActiva, setTabActiva,
    gymSeleccionado, setGymSeleccionado,
  };
}
