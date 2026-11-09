"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../api/authApi";
import { env } from "@/config/env";

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
    const baseUrl =
      env.apiUrl;
    window.location.href = `${baseUrl}/api/auth/oauth/google`;
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