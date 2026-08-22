"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1 className="auth-title">Cargando...</h1>
        </div>
      </div>
    );
  }

  // Si no hay sesión, el enlace de recuperación no es válido o ya expiró
  // (Supabase abre una sesión temporal automáticamente al hacer click en el
  // enlace del correo).
  if (!session) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1 className="auth-title">Enlace inválido o vencido</h1>
          <p className="auth-subtitle">
            Este enlace de recuperación ya no es válido. Solicita uno nuevo.
          </p>
          <Link href="/forgot-password" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Nueva contraseña</h1>
        <p className="auth-subtitle">Ingresa tu nueva contraseña para tu cuenta.</p>

        {error && <div className="error-box">{error}</div>}

        {done ? (
          <div className="success-box">
            Tu contraseña se actualizó correctamente. Te llevaremos a tu panel...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Nueva contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite la contraseña"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
