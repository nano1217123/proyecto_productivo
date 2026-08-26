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
    claveAdmin: "form.claveAdmin",
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
        // Petición al backend Express para administradores
        const response = await fetch("http://localhost:4000/api/auth/register", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
           },
          body: JSON.stringify({
            nombres: form.nombres,
            apellidos: form.apellidos,
            email: form.email,
            password: form.password,
            tipoUsuario: form.tipoUsuario,
            gimnasio: form.gimnasio,
            adminAdmin: form.claveAdmin,
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
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Regístrate para empezar</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
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

          <div className="field">
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

          <div className="field">
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

          <div className="field">
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

          <div className="field">
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

          <div className="field">
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
            <div className="field">
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

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-divider">o</div>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
        >
          {googleLoading ? "Redirigiendo a Google..." : "Continuar con Google"}
        </button>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}