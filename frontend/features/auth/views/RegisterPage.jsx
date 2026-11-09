"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useRegisterForm } from "../hooks/useRegisterForm";
import AuthInput from "@/components/ui/AuthInput";

function RegisterForm() {
  const { loginWithGoogle } = useAuth();
  const { form, error, submitting, handleChange, handleSubmit } = useRegisterForm();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
      <div className="w-full max-w-[410px] p-[38px_34px_32px] border border-[#383c35] rounded-[18px] bg-[rgba(28,30,27,0.95)] shadow-[0_22px_54px_rgba(0,0,0,0.42)]">
        <h1 className="m-0 mb-2 text-[27px] font-bold tracking-[-0.7px]">Crear cuenta</h1>
        <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Únete para empezar a entrenar</p>

        {error && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <AuthInput label="Nombres" id="nombres" value={form.nombres} onChange={(e) => handleChange("nombres", e.target.value)} />
            <AuthInput label="Apellidos" id="apellidos" value={form.apellidos} onChange={(e) => handleChange("apellidos", e.target.value)} />
          </div>
          <AuthInput label="Email" id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          <AuthInput label="Contraseña" id="password" type="password" value={form.password} onChange={(e) => handleChange("password", e.target.value)} />
          <AuthInput label="Confirmar contraseña" id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} />

          <button className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="flex items-center gap-2.5 my-[22px] text-xs text-[#a9afa7] before:content-[''] before:flex-1 before:h-px before:bg-[#30332f] after:content-[''] after:flex-1 after:h-px after:bg-[#30332f]">o</div>

        <button type="button" className="w-full p-3 border border-[#41463f] rounded-[10px] bg-[#151714] text-[#f2f4ef] text-sm font-bold cursor-pointer transition hover:border-[#b56cff] hover:bg-[#321d47]" onClick={loginWithGoogle}>
          Continuar con Google
        </button>

        <p className="mt-5 text-[13px] text-center text-[#a9afa7]">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]"><p className="text-sm text-[#a9afa7]">Cargando...</p></div>}>
      <RegisterForm />
    </Suspense>
  );
}
