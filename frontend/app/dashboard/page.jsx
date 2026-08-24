"use client";

import { useAuth } from "@/features/auth/context/AuthContext";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import AdminDashboardPage from "@/features/dashboard/pages/AdminDashboardPage";

export default function DashboardRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-wrapper">
        <p style={{ color: "var(--muted)", fontSize: "14px" }}>
          Cargando panel...
        </p>
      </div>
    );
  }

  const esAdmin = true;

  return esAdmin ? <AdminDashboardPage /> : <DashboardPage />;
}