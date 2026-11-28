"use client";

import Link from "next/link";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import { RecaptchaScript } from "../components/RecaptchaScript";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthForm } from "../hooks/useAuthForm";
import { useAuth } from "../context/AuthContext";

function LoginForm() {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const gym = searchParams.get("gym");
  const { sede } = useSedes();
  const nombreSede = gym ? sede(gym)?.nombre : null;
  const destination = gym
    ? `/dashboard?gym=${encodeURIComponent(gym)}`
    : "/dashboard";

  const { email, setEmail, password, setPassword, error, setError, submitting, handleLogin } = useAuthForm(destination, gym);

  // Maneja los errores que el backend agrega a la URL (?oauth=error)
  useEffect(() => {
    const oauthError = searchParams.get("oauth");
    if (oauthError) {
      try {
        const sedePendiente = sessionStorage.getItem("jjgym:oauth:sede");
        sessionStorage.removeItem("jjgym:oauth:sede");
        if (sedePendiente && !searchParams.has("gym")) {
          const url = new URL(window.location.href);
          url.searchParams.set("gym", sedePendiente);
          window.history.replaceState(null, "", url);
        }
      } catch { /* sin almacenamiento */ }
    }
    if (oauthError === "cancelled") {
      setError("Cancelaste el inicio de sesión con Google.");
    } else if (oauthError === "invalid") {
      setError("El enlace de Google no es válido.");
    } else if (oauthError === "error") {
      setError("No se pudo completar el inicio de sesión con Google.");
    }
  }, [searchParams, setError]);

  const recuperacion = new URLSearchParams();
  if (email) recuperacion.set("email", email);
  if (gym) recuperacion.set("gym", gym);

  async function handleSubmit(event) {
    event.preventDefault();
    await handleLogin(login);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
      <RecaptchaScript />
      <div className="w-full max-w-[410px] p-[38px_34px_32px] border border-[#383c35] rounded-[18px] bg-[rgba(28,30,27,0.95)] shadow-[0_22px_54px_rgba(0,0,0,0.42)]">
        <h1 className="m-0 mb-2 text-[27px] font-bold tracking-[-0.7px]">Iniciar sesión</h1>
        <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">{nombreSede ? `Acceso desde ${nombreSede}` : "Ingresa tus credenciales para continuar"}</p>

        {error && (
          <div role="alert" className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required autoComplete="email" />
          </div>

          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="password">Contraseña</label>
            <div className="relative">
              <input id="password" type={mostrarPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required autoComplete="current-password" className="w-full !pr-24" />
              <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a9afa7] hover:text-[#b56cff] cursor-pointer bg-transparent border-0 p-1 flex items-center" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {mostrarPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <Link href={`/forgot-password${recuperacion.size ? "?" + recuperacion : ""}`} className="inline-block mt-2 text-[12.5px] font-semibold text-[#b56cff] no-underline hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>

          <button className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" type="submit" aria-busy={submitting} disabled={submitting}>
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="flex items-center gap-2.5 my-[22px] text-xs text-[#a9afa7] before:content-[''] before:flex-1 before:h-px before:bg-[#30332f] after:content-[''] after:flex-1 after:h-px after:bg-[#30332f]">o</div>

        <button type="button" className="w-full p-3 border border-[#41463f] rounded-[10px] bg-[#151714] text-[#f2f4ef] text-sm font-bold cursor-pointer transition hover:border-[#b56cff] hover:bg-[#321d47]" onClick={() => loginWithGoogle(gym)}>Continuar con Google</button>

        <p className="mt-5 text-[13px] text-center text-[#a9afa7]">¿No tienes cuenta? <Link href={gym ? `/register?gym=${encodeURIComponent(gym)}` : "/register"}>Regístrate</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]"><p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Cargando...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
