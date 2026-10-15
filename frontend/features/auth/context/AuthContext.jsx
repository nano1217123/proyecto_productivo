"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../api/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function cargarSesion() {
      try {
        const { profile } = await apiClient.getProfile();
        if (!cancelled) setUser(profile);
      } catch (err) {
        if (err.status === 401) {
          try {
            await apiClient.refresh();
            const { profile } = await apiClient.getProfile();
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
    return apiClient.register({ nombres, apellidos, email, password });
  }

  async function verifyOtp(email, code) {
    return apiClient.verifyEmail({ email, code });
  }

  async function resendOtp(email) {
    return apiClient.resendCode({ email });
  }

  async function login(email, password) {
    const result = await apiClient.login({ email, password });
    const { profile } = await apiClient.getProfile();
    setUser(profile);
    return result;
  }

  async function logout() {
    try {
      await apiClient.logout();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      setUser(null);
      router.push("/login");
    }
  }

  async function resetPasswordForEmail(email) {
    return apiClient.forgotPassword({ email });
  }

  async function updatePassword(token, newPassword) {
    return apiClient.resetPassword({ token, password: newPassword });
  }

  async function loginWithGoogle() {
    throw new Error(
      "Google OAuth aún no está implementado. Falta integrarlo en el backend propio."
    );
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