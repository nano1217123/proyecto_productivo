import { Suspense } from "react";
import DashboardNavigation from "@/src/features/dashboard/views/DashboardNavigation";
import "@/src/features/dashboard/views/dashboard-navigation.css";

export default function DashboardLayout({ children }) {
  return <div className="dashboard-layout">
    <Suspense fallback={null}><DashboardNavigation /></Suspense>
    <div className="dashboard-content">{children}</div>
  </div>;
}
