"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { signUp, loginWithGoogle } = useAuth(); const router = useRouter();
  const [form, setForm] = useState({ nombres: "", apellidos: "", email: "", password: "" });
  const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false); const [googleLoading, setGoogleLoading] = useState(false);
  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  async function handleSubmit(event) { event.preventDefault(); setError(""); setSubmitting(true); try { await signUp(form.nombres, form.apellidos, form.email, form.password); router.push(`/verify-otp?email=${encodeURIComponent(form.email)}`); } catch (err) { setError(err.message); } finally { setSubmitting(false); } }
  async function handleGoogleSignup() { setError(""); setGoogleLoading(true); try { await loginWithGoogle(); } catch (err) { setError(err.message); setGoogleLoading(false); } }
  return <div className="auth-wrapper"><div className="auth-card"><h1 className="auth-title">Crear cuenta</h1><p className="auth-subtitle">Regístrate para empezar</p>{error && <div className="error-box">{error}</div>}<form onSubmit={handleSubmit}><div className="field"><label htmlFor="nombres">Nombres</label><input id="nombres" value={form.nombres} onChange={setField("nombres")} placeholder="Tus nombres" required autoComplete="given-name" /></div><div className="field"><label htmlFor="apellidos">Apellidos</label><input id="apellidos" value={form.apellidos} onChange={setField("apellidos")} placeholder="Tus apellidos" required autoComplete="family-name" /></div><div className="field"><label htmlFor="email">Email</label><input id="email" type="email" value={form.email} onChange={setField("email")} placeholder="tu@email.com" required autoComplete="email" /></div><div className="field"><label htmlFor="password">Contraseña</label><input id="password" type="password" value={form.password} onChange={setField("password")} placeholder="Mínimo 8 caracteres" required minLength={8} autoComplete="new-password" /></div><button className="btn-primary" type="submit" disabled={submitting}>{submitting ? "Creando cuenta..." : "Crear cuenta"}</button></form><div className="auth-divider">o</div><button type="button" className="btn-google" onClick={handleGoogleSignup} disabled={googleLoading}>{googleLoading ? "Redirigiendo a Google..." : "Continuar con Google"}</button><p className="auth-footer">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p></div></div>;
}
