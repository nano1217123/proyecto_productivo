import AdminDashboardPage from "@/features/dashboard/pages/AdminDashboardPage";
import RoleGuard from "@/features/auth/components/RoleGuard";

export default function AdminDashboardRoute() {
  return (
    <RoleGuard allowedRoles={["admin", "super_admin"]}>
      <AdminDashboardPage />
    </RoleGuard>
  );
}