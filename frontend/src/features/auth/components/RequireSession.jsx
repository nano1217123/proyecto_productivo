"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function RequireSession({ children }) {
  const { user, loading, sessionError, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !sessionError) {
      const gym = new URLSearchParams(window.location.search).get("gym");
      router.replace(gym ? `/login?gym=${encodeURIComponent(gym)}` : "/login");
    }
  }, [loading, user, sessionError, router]);

  if (user) return children;
  if (loading) return <p role="status">Verificando sesión…</p>;
  if (sessionError) return <div role="alert">
    <p>No se pudo verificar tu sesión.</p>
    <button type="button" onClick={refreshProfile}>Reintentar</button>
  </div>;
  return null;
}
