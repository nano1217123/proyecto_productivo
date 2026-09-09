"use client";

import { useAuth } from "@/features/auth/context/AuthContext";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import AdminDashboardPage from "@/features/dashboard/pages/AdminDashboardPage";

export default function DashboardRoute() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
        <p className="text-sm text-[#a9afa7]">Cargando panel...</p>
      </div>
    );
  }

 const esAdmin = ["admin_gimnasio", "super_admin", "desarrollador"].includes(profile?.tipo_usuario);
  return esAdmin ? <AdminDashboardPage /> : <DashboardPage />;
}