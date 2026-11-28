"use client";

import { Suspense, useEffect } from "react";
import { MemberDashboardSkeleton } from "@/src/components/ui/Skeleton";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import DashboardPage from "@/src/features/dashboard/views/DashboardPage";
import AdminDashboardPage from "@/src/features/admin/views/AdminDashboardPage";

export default function DashboardRoute() {
  const { profile, loading } = useAuth();

  const roleTitle = {
    admin: "Panel administrativo | J&J GYM",
    super_admin: "Panel de superadministración | J&J GYM",
  }[profile?.tipo_usuario];

  useEffect(() => {
    if (loading || !roleTitle) return;
    document.title = roleTitle;
    return () => {
      if (document.title === roleTitle) document.title = "Mi panel | J&J GYM";
    };
  }, [loading, roleTitle]);

  if (loading) return <MemberDashboardSkeleton />;

  // Roles actualizados según la nueva lógica del backend
  const esAdmin = ["admin", "super_admin"].includes(profile?.tipo_usuario);

  return esAdmin ? (
    <Suspense fallback={<MemberDashboardSkeleton />}><AdminDashboardPage /></Suspense>
  ) : <DashboardPage />;
}
