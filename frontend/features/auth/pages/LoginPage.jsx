"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";

function LoginForm() {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const gym = searchParams.get("gym");
  const destination = gym
    ? `/dashboard?gym=${encodeURIComponent(gym)}`
    : "/dashboard";

  // Maneja los errores que el backend agrega a la URL (?oauth=error)
  // cuando vuelve del flujo de Google.
  useEffect(() => {
    const oauthError = searchParams.get("oauth");
    if (oauthError === "cancelled") {
      setError("Cancelaste el inicio de sesión con Google.");
    } else if (oauthError === "invalid") {
      setError("El enlace de Google no es válido.");
    } else if (oauthError === "error") {
      setError("No se pudo completar el inicio de sesión con Google.");
    }
  }, [searchParams]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push(destination);
    } catch (err) {
      // Si el backend responde 403 porque falta verificar el correo,
      // redirigimos a /verify-otp.
      if (err.status === 403) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    window.location.href = `${baseUrl}/api/auth/oauth/google`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
      <div className="w-full max-w-[410px] p-[38px_34px_32px] border border-[#383c35] rounded-[18px] bg-[rgba(28,30,27,0.95)] shadow-[0_22px_54px_rgba(0,0,0,0.42)]">
        <h1 className="m-0 mb-2 text-[27px] font-bold tracking-[-0.7px]">
          Iniciar sesión
        </h1>
        <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">
          Ingresa tus credenciales para continuar
        </p>

        {error && (
          <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
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

          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="password">Contraseña</label>
            <div className="relative">
              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pr-12"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a9afa7] hover:text-[#b56cff] cursor-pointer bg-transparent border-0 p-1 flex items-center"
                tabIndex={-1}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarPassword ? (
                  // Ojo abierto
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  // Ojo tachado
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="inline-block mt-2 text-[12.5px] font-semibold text-[#b56cff] no-underline hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="flex items-center gap-2.5 my-[22px] text-xs text-[#a9afa7] before:content-[''] before:flex-1 before:h-px before:bg-[#30332f] after:content-[''] after:flex-1 after:h-px after:bg-[#30332f]">
          o
        </div>

        <button
          type="button"
          className="w-full p-3 border border-[#41463f] rounded-[10px] bg-[#151714] text-[#f2f4ef] text-sm font-bold cursor-pointer transition hover:border-[#b56cff] hover:bg-[#321d47]"
          onClick={handleGoogleLogin}
        >
          Continuar con Google
        </button>

        <p className="mt-5 text-[13px] text-center text-[#a9afa7]">
          ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
          <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">
            Cargando...
          </p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}