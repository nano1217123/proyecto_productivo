"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import TrainingProgressPage from "@/src/features/training/views/TrainingProgressPage";

export default function LegacyProgressRoute({ gym, modo }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const isAdmin = ["admin", "super_admin"].includes(profile?.tipo_usuario);
  useEffect(() => {
    if (loading || isAdmin) return;
    const query = new URLSearchParams({ vista: "rendimiento" });
    if (typeof gym === "string") query.set("gym", gym);
    if (typeof modo === "string") query.set("modo", modo);
    router.replace(`/dashboard/particular?${query}#vista-previa-progreso`);
  }, [loading, isAdmin, gym, modo, router]);
  if (isAdmin) return <TrainingProgressPage gym={gym} />;
  return <main className="progress-page"><p role="status">Cargando evolución por ejercicio…</p></main>;
}
