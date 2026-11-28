"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { pestanasAdmin } from "@/src/features/admin/lib/adminTabs";
import { HomeIcon } from "../components/HomePanel";
import "./dashboard-navigation.css";

const base = "/dashboard";

export default function DashboardNavigation() {
  const { profile, logout } = useAuth();
  const ruta = usePathname();
  const params = useSearchParams();
  const rol = profile?.tipo_usuario;
  if (!rol) return null;

  const admin = rol === "admin" || rol === "super_admin";
  const enCasa = rol === "usuario_particular" || params.get("modo") === "casa";
  const personal = [
    ["/ejercicios", enCasa ? "Ejercicios en casa" : "Ejercicios", "training"],
    ["/entrenamientos", "Registrar entrenamiento", "training"],
    ["/rutinas", "Mis rutinas", "routine"],
    ["/entrenamientos/historial", "Historial", "history"],
    ["/nutricion", "Nutrición", "nutrition"],
    ["/particular", "Mi progreso", "trend"],
    ...(rol === "usuario_particular" ? [["/pagos", "Suscripción", "card"]] : []),
  ];
  const adminIcons = { clientes: "routine", imagenes: "training", configuracion: "house", suscripcion: "card", "crear-admin": "routine" };
  const destinosAdmin = pestanasAdmin({ esAdmin: rol === "admin", esSuperAdmin: rol === "super_admin" })
    .map(({ id, etiqueta }) => ["", etiqueta, adminIcons[id], id]);
  const tieneResenas = admin || rol === "cliente" || rol === "usuario_particular";
  const destinos = [["", "Inicio", "house"], ...(admin ? destinosAdmin : personal),
    ...(tieneResenas ? [["/resenas", "Reseñas", "reviews"]] : []), ["/reportes", "Reportes", "routine"]];
  const subseccion = admin && ruta === base ? params.get("seccion") ?? "" : "";
  const activo = destinos.filter(([path, , , seccion = ""]) =>
    path ? ruta === base + path || ruta.startsWith(base + path + "/") : ruta === base && subseccion === seccion)
    .sort(([a], [b]) => b.length - a.length)[0];

  function enlace(path, seccion) {
    const query = new URLSearchParams();
    const gym = rol === "cliente" ? profile.sede : params.get("gym");
    if (seccion) query.set("seccion", seccion);
    if (gym && (!admin || (path === "/resenas" && rol === "admin" && profile.sedes_administradas?.includes(gym)))) {
      query.set("gym", gym);
    }
    if (enCasa && !admin) query.set("modo", "casa");
    return base + path + (query.size ? "?" + query : "");
  }

  function links(cerrar) {
    return destinos.map(([path, nombre, icon, seccion], index) => (
      <Link key={seccion ?? path} href={enlace(path, seccion)} aria-current={activo === destinos[index] ? "page" : undefined} onClick={cerrar}>
        <HomeIcon name={icon} /> {nombre}
      </Link>
    ));
  }

  function salir(event) {
    if (!event.defaultPrevented) logout();
  }

  return <aside className="dashboard-sidebar">
    <div className="dashboard-sidebar-desktop">
      <Link href={enlace("")} className="dashboard-brand">J&amp;J GYM</Link>
      <nav aria-label="Navegación del panel">{links()}</nav>
      <button type="button" data-salida-rutina onClick={salir}><HomeIcon name="exit" /> Cerrar sesión</button>
    </div>
    <details className="dashboard-sidebar-mobile">
      <summary><HomeIcon name="menu" /> <strong>J&amp;J GYM</strong><span>{activo?.[1] ?? "Panel"} · Menú</span></summary>
      <nav aria-label="Navegación del panel">
        {links((event) => { if (!event.defaultPrevented) event.currentTarget.closest("details").open = false; })}
      </nav>
      <button type="button" data-salida-rutina onClick={salir}><HomeIcon name="exit" /> Cerrar sesión</button>
    </details>
  </aside>;
}
