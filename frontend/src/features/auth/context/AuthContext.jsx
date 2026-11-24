"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function cargarSesion() {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("oauth") === "ok") {
          await new Promise((r) => setTimeout(r, 400));
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      try {
        const { profile } = await authApi.getProfile();
        if (!cancelled) setUser(profile);
      } catch (err) {
        if (err.status === 401) {
          try {
            await authApi.refresh();
            const { profile } = await authApi.getProfile();
            if (!cancelled) setUser(profile);
          } catch {
            if (!cancelled) setUser(null);
          }
        } else {
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    cargarSesion();
    return () => {
      cancelled = true;
    };
  }, []);

  // El rol y la sede se leen del servidor. Si cambian con la sesión abierta
  // (por ejemplo, un admin vincula esta cuenta a su sede), el panel se
  // actualiza al volver a la pestaña, sin cerrar sesión. El backend ya
  // aplica el nuevo rol desde la siguiente petición.
  const ultimaRecarga = useRef(0);
  const refreshProfile = useCallback(async () => {
    ultimaRecarga.current = Date.now();
    try {
      const { profile } = await authApi.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      // Otros errores (red, 5xx): se conserva el perfil actual y el panel.
      if (err?.status !== 401) return null;
    }
    // Access token vencido: mismo flujo que al cargar la sesión. Se renueva
    // con el refresh token y se reintenta una sola vez.
    try {
      await authApi.refresh();
      const { profile } = await authApi.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      // Error de red al renovar: no se cierra la sesión por eso.
      if (err?.status === 0 || err?.status === undefined) return null;
      // La renovación falló (refresh vencido o revocado): sesión terminada.
      setUser(null);
      router.replace("/login");
      return null;
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    function alVolver() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimaRecarga.current < 5000) return;
      refreshProfile();
    }
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [user, refreshProfile]);

  async function signUp(nombres, apellidos, email, password) {
    return authApi.register({ nombres, apellidos, email, password });
  }

   async function verifyOtp(email, code) {
    const result = await authApi.verifyEmail({ email, code });
    // El backend ya seteó las cookies → cargamos el perfil.
    const { profile } = await authApi.getProfile();
    setUser(profile);
    return result;
  }

  async function resendOtp(email) {
    return authApi.resendCode({ email });
  }

  async function login(email, password) {
    const result = await authApi.login({ email, password });
    const { profile } = await authApi.getProfile();
    setUser(profile);
    return result;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      setUser(null);
      await new Promise((r) => setTimeout(r, 100));
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  async function resetPasswordForEmail(email) {
    return authApi.forgotPassword({ email });
  }

  async function updatePassword(token, newPassword) {
    return authApi.resetPassword({ token, password: newPassword });
  }

  function loginWithGoogle() {
    window.location.href = "/api/auth/oauth/google";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        loading,
        signUp,
        verifyOtp,
        resendOtp,
        login,
        logout,
        resetPasswordForEmail,
        updatePassword,
        loginWithGoogle,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  return context;
}
