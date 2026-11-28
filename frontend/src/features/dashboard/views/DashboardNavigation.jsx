"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";

const base = "/dashboard";
const estilo = "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold no-underline hover:bg-[#321d47]";

export default function DashboardNavigation() {
  const { profile, logout } = useAuth();
  const ruta = usePathname();
  const params = useSearchParams();
  const rol = profile?.tipo_usuario;
  useEffect(() => {
    if (ruta !== base || params.get("oauth") !== "ok") return;
    try {
      const sede = sessionStorage.getItem("jjgym:oauth:sede");
      sessionStorage.removeItem("jjgym:oauth:sede");
      const destino = new URL(window.location.href);
      destino.searchParams.delete("oauth");
      if (sede) destino.searchParams.set("gym", sede);
      window.history.replaceState(null, "", destino);
    } catch { /* sin almacenamiento */ }
  }, [params, ruta]);
  if (!rol) return null;

  const admin = rol === "admin" || rol === "super_admin";
  const enCasa = rol === "usuario_particular" || params.get("modo") === "casa";
  const personal = [
    ["/ejercicios", enCasa ? "Ejercicios en casa" : "Ejercicios"],
    ["/rutinas", "Mis rutinas"],
    ["/entrenamientos", "Registrar entrenamiento"],
    ["/entrenamientos/historial", "Historial"],
    ["/nutricion", "Nutrición"],
    ...(rol === "cliente" && profile.sede ? [["/resenas", "Reseñas de mi sede"]] : []),
    ...(rol === "usuario_particular" ? [["/particular", "Mi progreso"], ["/pagos", "Suscripción"]] : []),
  ];
  const destinos = [["", "Inicio"], ...(admin ? [] : personal), ["/reportes", "Reportes"]];
  const activo = destinos.filter(([path]) => path ? ruta === base + path || ruta.startsWith(base + path + "/") : ruta === base)
    .sort(([a], [b]) => b.length - a.length)[0]?.[0];

  function enlace(path) {
    const query = new URLSearchParams();
    const gym = rol === "cliente" ? profile.sede : params.get("gym");
    if (gym && !admin) query.set("gym", gym);
    if (enCasa && !admin) query.set("modo", "casa");
    return base + path + (query.size ? "?" + query : "");
  }

  function links(cerrar) {
    return destinos.map(([path, nombre]) => (
      <Link key={path} href={enlace(path)} aria-current={activo === path ? "page" : undefined}
        onClick={cerrar} className={`${estilo} ${activo === path ? "bg-[#321d47] text-[#d7adff] underline underline-offset-4" : "text-[#f2f4ef]"}`}>
        {nombre}
      </Link>
    ));
  }

  return (
    <header className="border-b border-[#30332f] bg-[#171817] px-4 text-[#f2f4ef] sm:px-6">
      <div className="mx-auto flex max-w-[1060px] flex-wrap items-start justify-between gap-2 py-2">
        <nav aria-label="Navegación del panel" className="hidden min-w-0 flex-1 flex-wrap gap-1 lg:flex">{links()}</nav>
        <details className="min-w-0 flex-1 lg:hidden">
          <summary className="min-h-11 cursor-pointer list-none py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">{destinos.find(([path]) => path === activo)?.[1] ?? "Panel"} · Menú</summary>
          <nav aria-label="Navegación del panel" className="grid gap-1">
            {links((event) => { event.currentTarget.closest("details").open = false; })}
          </nav>
        </details>
        <button type="button" data-salida-rutina onClick={(event) => { if (!event.defaultPrevented) logout(); }} className={`${estilo} cursor-pointer text-[#a9afa7]`}>Cerrar sesión</button>
      </div>
    </header>
  );
}
