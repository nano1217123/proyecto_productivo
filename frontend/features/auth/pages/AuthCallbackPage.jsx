"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const { session, loading } = useAuth(); const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const destination = window.sessionStorage.getItem("postLoginDestination") || "/dashboard";
    window.sessionStorage.removeItem("postLoginDestination");
    router.replace(session ? destination : "/login");
  }, [loading, session, router]);
  return <div className="auth-wrapper"><div className="auth-card"><h1 className="auth-title">Conectando...</h1><p className="auth-subtitle">Estamos validando tu sesión de Google.</p></div></div>;
}
