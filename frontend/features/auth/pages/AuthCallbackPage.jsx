"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../api/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function completeLogin() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        // No hay código en la URL: no venimos de un flujo OAuth válido.
        router.replace("/login");
        return;
      }

      const { data, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !data.session) {
        console.error("Error de autenticación:", exchangeError);
        setError("No se pudo completar el inicio de sesión con Google.");
        setTimeout(() => router.replace("/login"), 1500);
        return;
      }

      const destination =
        window.sessionStorage.getItem("postLoginDestination") || "/dashboard";
      window.sessionStorage.removeItem("postLoginDestination");
      router.replace(destination);
    }

    completeLogin();
  }, [router]);

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Conectando...</h1>
        <p className="auth-subtitle">
          {error || "Estamos validando tu sesión de Google."}
        </p>
      </div>
    </div>
  );
}