"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../api/supabaseClient";

const AuthContext = createContext(null);

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
    if (error) throw new Error(error.message);

    // Supabase no lanza error si el correo ya existe y está confirmado
    // (para no revelar qué correos están registrados): en ese caso devuelve
    // un usuario "fantasma" sin identidades nuevas. Lo detectamos así.
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error("Este correo ya está registrado. Intenta iniciar sesión.");
    }

    return data;
  }

  async function verifyOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (error) throw new Error(error.message);
    return data;
  }

  async function resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw new Error(error.message);
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function resetPasswordForEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signUp, verifyOtp, resendOtp, login, loginWithGoogle, logout, resetPasswordForEmail, updatePassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  return context;
}
