"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function RoleGuard({ children, allowedRoles }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile) {
      const userRole = profile.tipo_usuario;

      if (!allowedRoles.includes(userRole)) {
        // Si es admin, lo mandamos a /dashboard/admin
        if (userRole === "admin" || userRole === "super_admin") {
          router.replace("/dashboard/admin");
        } 
        // Si es cliente, lo mandamos a /dashboard
        else if (userRole === "cliente") {
          router.replace("/dashboard");
        } 
        // Si es un rol desconocido, al login
        else {
          router.replace("/login");
        }
      }
    }
  }, [profile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171817] text-[#a9afa7]">
        Verificando permisos...
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.tipo_usuario)) {
    return null; // No renderiza nada mientras redirige
  }

  return children;
}
