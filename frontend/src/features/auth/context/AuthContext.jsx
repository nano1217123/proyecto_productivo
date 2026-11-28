"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { SESSION_ENDED, withSessionLock } from "@/src/lib/api/sessionFetch";
import { authApi } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const ultimaRecarga = useRef(0);
  const revisionSesion = useRef(0);

  const refreshProfile = useCallback(async () => {
    const revision = ++revisionSesion.current;
    ultimaRecarga.current = Date.now();
    try {
      const { profile } = await authApi.getProfile();
      if (revision !== revisionSesion.current) return null;
      setUser(profile);
      setSessionError(false);
      return profile;
    } catch (err) {
      if (revision !== revisionSesion.current) return null;
      if (err?.status === 401) {
        setUser(null);
        setSessionError(false);
      } else {
        setSessionError(true);
      }
      return null;
    } finally {
      if (revision === revisionSesion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    function endSession() {
      revisionSesion.current++;
      setUser(null);
      setSessionError(false);
      setLoading(false);
    }

    const destino = new URL(window.location.href);
    if (destino.searchParams.get("oauth") === "ok") {
      try {
        const sede = sessionStorage.getItem("jjgym:oauth:sede");
        sessionStorage.removeItem("jjgym:oauth:sede");
        if (sede) destino.searchParams.set("gym", sede);
      } catch { /* sin almacenamiento */ }
      destino.searchParams.delete("oauth");
      window.history.replaceState(null, "", destino);
    }

    window.addEventListener(SESSION_ENDED, endSession);
    void refreshProfile();
    return () => {
      revisionSesion.current++;
      window.removeEventListener(SESSION_ENDED, endSession);
    };
  }, [refreshProfile]);

  // Relee el rol y la sede al volver a la pestaña.
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
    const result = await withSessionLock(() => authApi.verifyEmail({ email, code }));
    // El backend ya seteó las cookies → cargamos el perfil.
    const { profile } = await authApi.getProfile();
    revisionSesion.current++;
    setUser(profile);
    setSessionError(false);
    setLoading(false);
    return result;
  }

  async function resendOtp(email) {
    return authApi.resendCode({ email });
  }

  async function login(email, password) {
    const result = await withSessionLock(() => authApi.login({ email, password }));
    const { profile } = await authApi.getProfile();
    revisionSesion.current++;
    setUser(profile);
    setSessionError(false);
    setLoading(false);
    return result;
  }

  async function logout() {
    await withSessionLock(authApi.logout);
    window.dispatchEvent(new Event(SESSION_ENDED));
  }

  async function resetPasswordForEmail(email) {
    return authApi.forgotPassword({ email });
  }

  async function updatePassword(token, newPassword) {
    const result = await withSessionLock(() => authApi.resetPassword({ token, password: newPassword }));
    if (user) void refreshProfile();
    return result;
  }

  function loginWithGoogle(gym) {
    try {
      if (gym) sessionStorage.setItem("jjgym:oauth:sede", gym);
      else sessionStorage.removeItem("jjgym:oauth:sede");
    } catch { /* sin almacenamiento */ }
    window.location.href = "/api/auth/oauth/google";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        loading,
        sessionError,
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
