"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function VerifyOtpPage({ email }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { verifyOtp } = useAuth();
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] p-6 bg-[#212320] border border-[#41433f] rounded-xl">
        <h1 className="text-xl font-bold mb-4 text-[#f2f4ef]">Verifica tu correo</h1>
        {error && <p className="text-[#ff7979] mb-4 text-sm">{error}</p>}
        <p className="text-sm text-[#a9afa7] mb-4">Ingresa el código de 6 dígitos enviado a {email}</p>
        <input 
          type="text" 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          maxLength={6}
          className="w-full p-3 mb-4 bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-center tracking-[10px] text-xl"
        />
        <button type="submit" disabled={submitting || code.length !== 6} className="w-full p-3 bg-[#b56cff] text-[#10110f] font-bold rounded-lg disabled:opacity-50">
          {submitting ? "Verificando..." : "Verificar código"}
        </button>
      </form>
    </div>
  );
}
