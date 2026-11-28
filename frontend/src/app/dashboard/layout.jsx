import { Suspense } from "react";
import DashboardNavigation from "@/src/features/dashboard/views/DashboardNavigation";

export default function DashboardLayout({ children }) {
  return (
    <>
      <Suspense fallback={null}><DashboardNavigation /></Suspense>
      {children}
    </>
  );
}
