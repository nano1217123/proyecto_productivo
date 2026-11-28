import { Suspense } from "react";
import ProgressPage from "@/src/features/progress/ProgressPage";

export default function Page() {
  return <Suspense fallback={<main className="progress-page"><p role="status">Cargando Mi progreso…</p></main>}>
    <ProgressPage />
  </Suspense>;
}
