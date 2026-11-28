"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function VerifyOtpPage({ email, gym }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { verifyOtp } = useAuth();
  const router = useRouter();
  const codigoRef = useRef(null);
  useEffect(() => { if (error && !submitting) codigoRef.current?.focus(); }, [error, submitting]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await verifyOtp(email, code);
      router.push(gym ? `/dashboard?gym=${encodeURIComponent(gym)}` : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] p-6 bg-[#212320] border border-[#41433f] rounded-xl">
        <h1 className="text-xl font-bold mb-4 text-[#f2f4ef]">Verifica tu correo</h1>
        <p className="text-sm text-[#a9afa7] mb-4">Ingresa el código de 6 dígitos enviado a <strong className="break-all">{email}</strong>.</p>
        <label htmlFor="codigo" className="mb-2 block text-sm font-bold">Código de verificación</label>
        <input
          ref={codigoRef}
          id="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "error-codigo" : undefined}
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onPaste={(event) => {
            event.preventDefault();
            setCode(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
          }}
          className="w-full p-3 mb-4 bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-center tracking-[10px] text-xl"
        />
        {error && <p id="error-codigo" role="alert" className="mb-4 text-sm text-[#ff7979]">{error}</p>}
        <button type="submit" aria-busy={submitting} disabled={submitting || code.length !== 6} className="w-full p-3 bg-[#b56cff] text-[#10110f] font-bold rounded-lg disabled:opacity-50">
          {submitting ? "Verificando..." : "Verificar código"}
        </button>
      </form>
    </div>
  );
}
