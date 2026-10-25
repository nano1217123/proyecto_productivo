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
        if (userRole === "admin" || userRole === "super_admin") {
          router.replace("/dashboard/admin");
        } else if (userRole === "cliente") {
          router.replace("/dashboard");
        } else {
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
    return null;
  }

  return children;
}