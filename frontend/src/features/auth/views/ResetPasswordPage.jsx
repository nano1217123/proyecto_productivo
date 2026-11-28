"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";

function ResetPasswordForm() {
  const { updatePassword } = useAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const gymUrl = searchParams.get("gym");
  const [gymRecuperacion, setGymRecuperacion] = useState(null);
  useEffect(() => {
    try {
      const registro = JSON.parse(localStorage.getItem("jjgym:recuperacion:sede"));
      if (typeof registro?.gym === "string" && registro.vence > Date.now()) setGymRecuperacion(registro.gym);
    } catch { /* sin almacenamiento */ }
  }, []);
  const gym = gymUrl ?? gymRecuperacion;
  const querySede = gym ? `?gym=${encodeURIComponent(gym)}` : "";

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
      await updatePassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Sin token en la URL: enlace inválido
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
        <div className="w-full max-w-[410px] p-[38px_34px_32px] border border-[#383c35] rounded-[18px] bg-[rgba(28,30,27,0.95)] shadow-[0_22px_54px_rgba(0,0,0,0.42)]">
          <h1 className="m-0 mb-2 text-[27px] font-bold tracking-[-0.7px]">Enlace inválido</h1>
          <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">
            Este enlace no es válido. Solicita uno nuevo.
          </p>
          <Link
            href={`/forgot-password${querySede}`}
            className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
      <div className="w-full max-w-[410px] p-[38px_34px_32px] border border-[#383c35] rounded-[18px] bg-[rgba(28,30,27,0.95)] shadow-[0_22px_54px_rgba(0,0,0,0.42)]">
        <h1 className="m-0 mb-2 text-[27px] font-bold tracking-[-0.7px]">Nueva contraseña</h1>
        <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">
          Ingresa tu nueva contraseña para tu cuenta.
        </p>

        {error && (
          <div role="alert" className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">
            {error}
          </div>
        )}

        {done ? (
          <div className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#251833] text-[#d7adff] text-[13px] leading-[1.5]">
            Tu contraseña se actualizó correctamente.
            <Link href={`/login${querySede}`} className="mt-2 block font-bold underline">Ir a iniciar sesión</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
              <label htmlFor="password">Nueva contraseña</label>
              <p id="reglas-clave" className="mb-2 text-sm text-[#a9afa7]">De 8 a 30 caracteres, con al menos una mayúscula y un número.</p>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby="reglas-clave"
                required
                minLength={8}
                maxLength={30}
                autoComplete="new-password"
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite la contraseña"
                required
                minLength={8}
                maxLength={30}
                autoComplete="new-password"
              />
            </div>

            <button
              className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              aria-busy={submitting}
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_8%_12%,rgba(181,108,255,0.14),transparent_25rem),linear-gradient(135deg,#10110f,#181a17_52%,#111310)]">
          <p className="m-0 mb-7 text-sm leading-[1.5] text-[#a9afa7]">Cargando...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}