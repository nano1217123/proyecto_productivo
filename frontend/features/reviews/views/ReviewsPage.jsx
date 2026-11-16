
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import reviewsApi from "../api/reviewsApi";

export default function ReviewsPage({ gym = "jj-poblado" }) {
  const { user, loading: authLoading, logout } = useAuth();

  const [resenas, setResenas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState("");
  const [publicando, setPublicando] = useState(false);

  const rol = user?.tipo_usuario;

  async function cargarResenas() {
    setCargando(true);
    setError("");

    try {
      const resultado =
        rol === "super_admin"
          ? await reviewsApi.getAllReviews()
          : await reviewsApi.getPublicReviews(gym);

      setResenas(resultado);
    } catch (err) {
      setError(err.message || "No se pudieron cargar las reseñas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCargando(false);
      return;
    }

    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError("");

      try {
        const resultado =
          user.tipo_usuario === "super_admin"
            ? await reviewsApi.getAllReviews()
            : await reviewsApi.getPublicReviews(gym);

        if (!cancelado) {
          setResenas(resultado);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || "No se pudieron cargar las reseñas.");
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [authLoading, user, gym]);

  async function handlePublicar(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!comentario.trim()) {
      setError("Escribe un comentario antes de publicar.");
      return;
    }

    setPublicando(true);

    try {
      await reviewsApi.createReview({
        gymSlug: gym,
        calificacion,
        comentario,
      });

      setComentario("");
      setCalificacion(5);

      if (calificacion >= 4) {
        await cargarResenas();
      }

      setMensaje(
        calificacion >= 4
          ? "¡Tu reseña se publicó correctamente!"
          : "Tu reseña fue enviada correctamente. Las reseñas de baja calificación no son públicas."
      );
    } catch (err) {
      setError(err.message || "No se pudo publicar la reseña.");
    } finally {
      setPublicando(false);
    }
  }

  if (authLoading || cargando) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#171817] text-[#a9afa7]">
        Cargando reseñas...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#171817] text-[#f2f4ef]">
        Debes iniciar sesión para consultar las reseñas.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#171817] px-6 pb-16 text-[#f2f4ef]">
      <header className="mx-auto flex min-h-[82px] w-full max-w-[1060px] items-center justify-between border-b border-[#30332f]">
        <Link
          href={`/dashboard?gym=${encodeURIComponent(gym)}`}
          className="text-lg font-extrabold tracking-widest text-[#f2f4ef] no-underline"
        >
          J&amp;J GYM · RESEÑAS
        </Link>

        <button
          type="button"
          onClick={logout}
          className="border-b border-[#6f756b] bg-transparent py-2 text-sm text-[#a9afa7] hover:text-white"
        >
          Cerrar sesión
        </button>
      </header>

      <section className="mx-auto w-full max-w-[1060px] pt-12">
        <Link
          href={`/dashboard?gym=${encodeURIComponent(gym)}`}
          className="mb-8 inline-block text-sm text-[#a9afa7] no-underline hover:text-white"
        >
          ← Volver al inicio
        </Link>

        <p className="mb-3 text-xs font-extrabold tracking-[2.7px] text-[#d5ad55]">
          OPINIONES DE NUESTROS USUARIOS
        </p>

        <h1 className="mb-3 text-4xl font-bold">Reseñas</h1>

        <p className="mb-8 text-sm text-[#a9afa7]">
          Conoce las experiencias y opiniones de nuestra comunidad.
        </p>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-5 rounded-lg border border-green-500/30 bg-green-950/30 p-3 text-sm text-green-300">
            {mensaje}
          </div>
        )}

        {rol === "cliente" && (
          <section className="mb-10 rounded-xl border border-[#41433f] bg-[#212320] p-6">
            <h2 className="mb-2 text-xl font-bold">
              Comparte tu experiencia
            </h2>

            <p className="mb-5 text-sm text-[#a9afa7]">
              Tu opinión nos ayuda a mejorar.
            </p>

            <form onSubmit={handlePublicar}>
              <label className="mb-3 block text-sm font-semibold">
                Tu calificación
              </label>

              <div className="mb-5 flex gap-2">
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    onClick={() => setCalificacion(estrella)}
                    aria-label={`${estrella} estrellas`}
                    className={`text-3xl ${
                      estrella <= calificacion
                        ? "text-[#d5ad55]"
                        : "text-[#555951]"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <label
                htmlFor="comentario"
                className="mb-2 block text-sm font-semibold"
              >
                Tu comentario
              </label>

              <textarea
                id="comentario"
                value={comentario}
                onChange={(event) => setComentario(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Cuéntanos cómo fue tu experiencia..."
                className="mb-2 w-full rounded-lg border border-[#41433f] bg-[#171817] p-3 text-sm text-white outline-none focus:border-[#d5ad55]"
              />

              <p className="mb-5 text-right text-xs text-[#a9afa7]">
                {comentario.length}/1000 caracteres
              </p>

              <button
                type="submit"
                disabled={publicando}
                className="rounded-lg bg-[#d5ad55] px-6 py-3 text-sm font-bold text-[#171817] transition hover:bg-[#e8c879] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publicando ? "Publicando..." : "Publicar reseña"}
              </button>
            </form>
          </section>
        )}

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              {rol === "super_admin"
                ? "Todas las reseñas"
                : "Opiniones de la comunidad"}
            </h2>

            <button
              type="button"
              onClick={cargarResenas}
              className="text-sm text-[#d5ad55] hover:underline"
            >
              Actualizar
            </button>
          </div>

          {resenas.length === 0 ? (
            <div className="rounded-xl border border-[#41433f] bg-[#212320] p-6 text-sm text-[#a9afa7]">
              Todavía no hay reseñas disponibles.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {resenas.map((resena) => (
                <article
                  key={resena.id}
                  className="rounded-xl border border-[#41433f] bg-[#212320] p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xl tracking-wider text-[#d5ad55]">
                      {"★".repeat(resena.calificacion)}
                      <span className="text-[#555951]">
                        {"★".repeat(5 - resena.calificacion)}
                      </span>
                    </span>

                    <span className="text-xs text-[#a9afa7]">
                      {new Date(resena.creado_en).toLocaleDateString("es-CO")}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#f2f4ef]">
                    {resena.comentario}
                  </p>

                  {rol === "super_admin" && (
                    <p className="mt-4 text-xs text-[#a9afa7]">
                      Gimnasio: {resena.gym_slug}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
