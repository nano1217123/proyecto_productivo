"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";

function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const gym = searchParams.get("gym");
  const destination = gym ? `/dashboard?gym=${encodeURIComponent(gym)}` : "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { await login(email, password); router.push(destination); }
    catch (err) {
      if (err.message.toLowerCase().includes("confirm")) { router.push(`/verify-otp?email=${encodeURIComponent(email)}`); return; }
      setError(err.message);
    } finally { setSubmitting(false); }
  }
  async function handleGoogleLogin() {
    setError(""); setGoogleLoading(true);
    try {
      window.sessionStorage.setItem("postLoginDestination", destination);
      await loginWithGoogle();
    } catch (err) { setError(err.message); setGoogleLoading(false); }
  }
  return <div className="auth-wrapper"><div className="auth-card">
    <h1 className="auth-title">Iniciar sesión</h1><p className="auth-subtitle">Ingresa tus credenciales para continuar</p>
    {error && <div className="error-box">{error}</div>}
    <form onSubmit={handleSubmit}><div className="field"><label htmlFor="email">Email</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required autoComplete="email" /></div><div className="field"><label htmlFor="password">Contraseña</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required autoComplete="current-password" /><Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="auth-link-inline">¿Olvidaste tu contraseña?</Link></div><button className="btn-primary" type="submit" disabled={submitting}>{submitting ? "Ingresando..." : "Iniciar sesión"}</button></form>
    <div className="auth-divider">o</div><button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={googleLoading}>{googleLoading ? "Redirigiendo a Google..." : "Continuar con Google"}</button>
    <p className="auth-footer">¿No tienes cuenta? <Link href="/register">Regístrate</Link></p>
  </div></div>;
}

export default function LoginPage() {
  return <Suspense fallback={<div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>}><LoginForm /></Suspense>;
}
