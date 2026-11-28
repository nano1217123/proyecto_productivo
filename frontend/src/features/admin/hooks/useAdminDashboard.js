import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { PESTANA_INICIAL, restaurarPestana } from "../lib/adminTabs.js";

export const claveSedeAdmin = (perfil) => `jjgym:admin:sede:${perfil?.idusuario ?? perfil?.tipo_usuario ?? ""}`;

export function leerSedeAdmin(clave) {
  try { return sessionStorage.getItem(clave); } catch { return null; }
}

const CLAVE_PESTANA = "jjgym:admin:pestana";
// «Miembros» se retiró: el plan, el vencimiento y el cobro del alumno se
// gestionan fuera de la plataforma (RN-014). Los clientes reales de cada sede
// están en «Clientes». Una pestaña guardada que ya no existe vuelve a esta.

export function useAdminDashboard() {
  const { profile } = useAuth();
  const seccion = useSearchParams().get("seccion");
  const esSuperAdmin = profile?.tipo_usuario === "super_admin";
  const esAdmin = profile?.tipo_usuario === "admin";
  
  // Navegación. La pestaña activa se conserva si el panel se vuelve a montar
  // o se recarga la página, siempre que el rol actual pueda verla.
  const [tabGuardada, setTabActivaEstado] = useState(PESTANA_INICIAL);
  const setTabActiva = useCallback((tab) => {
    setTabActivaEstado(tab);
    const destino = new URL(window.location.href);
    if (destino.searchParams.has("seccion")) {
      destino.searchParams.set("seccion", tab);
      window.history.replaceState(null, "", destino);
    }
    try { sessionStorage.setItem(CLAVE_PESTANA, tab); } catch { /* sin almacenamiento */ }
  }, []);
  useEffect(() => {
    let guardada = null;
    try { guardada = sessionStorage.getItem(CLAVE_PESTANA); } catch { /* sin almacenamiento */ }
    if (guardada) setTabActivaEstado(guardada);
  }, []);
  const tabActiva = restaurarPestana(seccion ?? tabGuardada, { esSuperAdmin, esAdmin });

  useEffect(() => {
    if (seccion !== tabActiva) return;
    setTabActivaEstado(tabActiva);
    try { sessionStorage.setItem(CLAVE_PESTANA, tabActiva); } catch { /* sin almacenamiento */ }
  }, [seccion, tabActiva]);
  // Sede elegida en el panel. Las opciones salen del servidor: las sedes
  // del admin (admin_sedes) o el catálogo completo para el super_admin.
  const clave = claveSedeAdmin(profile);
  const [seleccion, setSeleccion] = useState(() => ({ clave, sede: leerSedeAdmin(clave) }));
  const gymSeleccionado = seleccion.clave === clave ? seleccion.sede : leerSedeAdmin(clave);
  const setGymSeleccionado = useCallback((id) => {
    setSeleccion({ clave, sede: id });
    try { sessionStorage.setItem(clave, id); } catch { /* sin almacenamiento */ }
  }, [clave]);
  
  return {
    esSuperAdmin,
    tabActiva, setTabActiva,
    gymSeleccionado, setGymSeleccionado,
  };
}
