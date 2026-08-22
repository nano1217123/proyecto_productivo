"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";

function ForgotPasswordForm() {
  const { resetPasswordForEmail } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await resetPasswordForEmail(email);
      // Mostramos el mismo mensaje exista o no la cuenta, para no revelar
      // qué correos están registrados (buena práctica de seguridad).
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-subtitle">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {error && <div className="error-box">{error}</div>}

        {sent ? (
          <div className="success-box">
            Si <strong>{email}</strong> está registrado, te enviamos un correo con
            instrucciones para restablecer tu contraseña. Revisa también tu carpeta
            de spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          ¿Ya la recordaste? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-wrapper"><p className="auth-subtitle">Cargando...</p></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
