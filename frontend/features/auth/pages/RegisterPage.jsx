"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

const GIMNASIOS = [
  { id: "jj-poblado", nombre: "JJ GYM El Poblado" },
  { id: "power-laureles", nombre: "Power Laureles" },
  { id: "fit-belen", nombre: "Fit Lab Belén" },
];

export default function RegisterPage() {
  const { signUp, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    password: "",
    tipoUsuario: "cliente",
    gimnasio: "jj-poblado",
    claveAdmin: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const setField = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (form.tipoUsuario === "admin_gimnasio") {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${apiUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
    nombres: form.nombres,
    apellidos: form.apellidos,
    email: form.email,
    password: form.password,
    tipoUsuario: form.tipoUsuario,
    gimnasio: form.gimnasio,
    claveAdmin: form.claveAdmin,
  }),
});

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Error al registrar el administrador");
        }

        router.push(`/verify-otp?email=${encodeURIComponent(form.email)}`);
      } else {
        // Registro estándar de cliente con AuthContext / Supabase
        await signUp(form.nombres, form.apellidos, form.email, form.password);
        router.push(`/verify-otp?email=${encodeURIComponent(form.email)}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
      <div className="w-full max-w-[410px] p-[38px_34px_32px] border border-[#383c35] rounded-[18px] bg-[rgba(28,30,27,0.95)] shadow-[0_22px_54px_rgba(0,0,0,0.42)]">
        <h1 className="m-0 mb-2 text-[27px] font-bold tracking-[-0.7px]">Crear cuenta</h1>
        <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Regístrate para empezar</p>

        {error && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="nombres">Nombres</label>
            <input
              id="nombres"
              value={form.nombres}
              onChange={setField("nombres")}
              placeholder="Tus nombres"
              required
              autoComplete="given-name"
            />
          </div>

          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="apellidos">Apellidos</label>
            <input
              id="apellidos"
              value={form.apellidos}
              onChange={setField("apellidos")}
              placeholder="Tus apellidos"
              required
              autoComplete="family-name"
            />
          </div>

          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={setField("email")}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={setField("password")}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="gimnasio">Sede / Gimnasio</label>
            <select
              id="gimnasio"
              value={form.gimnasio}
              onChange={setField("gimnasio")}
            >
              {GIMNASIOS.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
            <label htmlFor="tipoUsuario">Tipo de cuenta</label>
            <select
              id="tipoUsuario"
              value={form.tipoUsuario}
              onChange={setField("tipoUsuario")}
            >
              <option value="cliente">Cliente / Miembro</option>
              <option value="admin_gimnasio">Administrador de Gimnasio</option>
            </select>
          </div>

          {form.tipoUsuario === "admin_gimnasio" && (
            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label htmlFor="claveAdmin">Clave Secreta de Admin</label>
              <input
                id="claveAdmin"
                type="password"
                value={form.claveAdmin}
                onChange={setField("claveAdmin")}
                placeholder="Ingresa la clave del sistema"
                required
              />
            </div>
          )}

          <button className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="flex items-center gap-2.5 my-[22px] text-xs text-[#a9afa7] before:content-[''] before:flex-1 before:h-px before:bg-[#30332f] after:content-[''] after:flex-1 after:h-px after:bg-[#30332f]">o</div>

        <button
          type="button"
          className="w-full p-3 border border-[#41463f] rounded-[10px] bg-[#151714] text-[#f2f4ef] text-sm font-bold cursor-pointer transition hover:border-[#b56cff] hover:bg-[#321d47] disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
        >
          {googleLoading ? "Redirigiendo a Google..." : "Continuar con Google"}
        </button>

        <p className="mt-5 text-[13px] text-center text-[#a9afa7]">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}