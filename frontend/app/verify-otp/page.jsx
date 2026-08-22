"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";

function VerifyOtpForm() {
  const { verifyOtp, resendOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await verifyOtp(email, code);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    setResending(true);
    try {
      await resendOtp(email);
      setInfo("Te enviamos un nuevo código a tu correo.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Verifica tu correo</h1>
        <p className="auth-subtitle">
          Enviamos un código de 6 dígitos a <strong>{email}</strong>
        </p>

        {error && <div className="error-box">{error}</div>}
        {info && (
          <div className="error-box" style={{ color: "#5b8cff", borderColor: "rgba(91,140,255,0.35)", background: "rgba(91,140,255,0.1)" }}>
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="code">Código de 6 dígitos</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              required
              style={{ letterSpacing: "4px", textAlign: "center", fontSize: 18 }}
            />
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={submitting || code.length !== 6}
          >
            {submitting ? "Verificando..." : "Verificar código"}
          </button>
        </form>

        <p className="auth-footer">
          ¿No te llegó?{" "}
          <button
            onClick={handleResend}
            disabled={resending}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              padding: 0,
              font: "inherit",
            }}
          >
            {resending ? "Enviando..." : "Reenviar código"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
