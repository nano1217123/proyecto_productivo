"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../api/supabaseClient";

const AuthContext = createContext(null);

function handleAuthError(error, fallbackMessage) {
  console.error("Error de autenticación:", error);
  throw new Error(fallbackMessage);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("idusuario", userId)
      .single();

    if (!error) setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      if (activeSession) fetchProfile(activeSession.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      if (activeSession) fetchProfile(activeSession.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(nombres, apellidos, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombres, apellidos } },
    });
    if (error) handleAuthError(error, "No se pudo crear la cuenta. Verifica tus datos.");

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error("Este correo ya está registrado. Intenta iniciar sesión.");
    }

    return data;
  }

  async function verifyOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (error) handleAuthError(error, "El código ingresado no es válido o expiró.");
    return data;
  }

  async function resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) handleAuthError(error, "No se pudo reenviar el código. Intenta de nuevo.");
  }

  // FIX: actualiza session/profile de inmediato tras un login exitoso, en vez
  // de depender únicamente del evento asíncrono onAuthStateChange. Sin esto,
  // cualquier componente que se monte justo después del login (ej. al navegar
  // a /dashboard) lee un `user` obsoleto y rebota a /login.
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Error de autenticación:", error);
      if (error.message.toLowerCase().includes("confirm")) {
        throw new Error(error.message);
      }
      throw new Error("No se pudo completar la autenticación. Verifica tus datos.");
    }

    setSession(data.session);
    if (data.session) {
      await fetchProfile(data.session.user.id);
    } else {
      setLoading(false);
    }

    return data;
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) handleAuthError(error, "No se pudo iniciar sesión con Google. Intenta de nuevo.");
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error de autenticación:", error);
    setSession(null);
    setProfile(null);
    router.push("/login");
  }

  async function resetPasswordForEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) handleAuthError(error, "No se pudo enviar el enlace de recuperación. Intenta de nuevo.");
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) handleAuthError(error, "No se pudo actualizar la contraseña. Intenta de nuevo.");
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signUp, verifyOtp, resendOtp, login, loginWithGoogle, logout, resetPasswordForEmail, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  return context;
}