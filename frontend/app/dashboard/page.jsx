"use client";

import { useAuth } from "@/features/auth/context/AuthContext";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import RoleGuard from "@/features/auth/components/RoleGuard";


export default function DashboardRoute() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile) {
      // Si es admin, lo enviamos a su panel exclusivo
      if (["admin", "super_admin"].includes(profile.tipo_usuario)) {
        router.replace("/dashboard/admin");
      }
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
        <p className="text-sm text-[#a9afa7]">Cargando panel...</p>
      </div>
    );
  }

  // Si es admin, mostramos un mensaje mientras redirige
  if (["admin", "super_admin"].includes(profile?.tipo_usuario)) {
    return <div className="text-white p-10">Redirigiendo a tu panel de administrador...</div>;
  }

  // Si es cliente, ve su dashboard normal
  return <DashboardPage />;
}