
"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import reviewsApi from "../api/reviewsApi";

export default function ReviewsPage({ gym = "jj-poblado" }) {
  const { user, loading: authLoading } = useAuth();
  const { sede: datosSede } = useSedes();

  const [resenas, setResenas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState("");
  const [publicando, setPublicando] = useState(false);

  const solicitudActual = useRef(0);
  const contextoActual = useRef(null);
  const publicacionPendiente = useRef(false);
  const usuarioId = user?.idusuario;
  const rol = user?.tipo_usuario;
  // El cliente reseña la sede registrada en el servidor, no la de la URL.
  const sedeResena = rol === "cliente" ? user?.sede ?? null : gym;
  const clienteSinSede = rol === "cliente" && !sedeResena;

  // Carga las reseñas según el rol del usuario.
  const cargarResenas = useCallback(async () => {
    const solicitud = ++solicitudActual.current;

    if (!usuarioId) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    try {
      if (rol !== "super_admin" && !sedeResena) {
        if (solicitud === solicitudActual.current) setResenas([]);
        return;
      }
      const resultado =
        rol === "super_admin"
          ? await reviewsApi.getAllReviews()
          : await reviewsApi.getPublicReviews(sedeResena);

      // Evita actualizar la pantalla con respuestas antiguas.
      if (solicitud === solicitudActual.current) {
        setResenas(resultado);
      }
    } catch {
      if (solicitud === solicitudActual.current) {
        setError("No se pudieron cargar las reseñas. Puedes volver a actualizar el listado.");
      }
    } finally {
      if (solicitud === solicitudActual.current) {
        setCargando(false);
      }
    }
  }, [usuarioId, rol, sedeResena]);

  // Carga las reseñas cuando termina la autenticación.
  useLayoutEffect(() => {
    if (authLoading) return;

    contextoActual.current = Symbol();
    setPublicando(publicacionPendiente.current);
    setResenas([]);
    setError("");
    setMensaje("");
    setComentario("");
    setCalificacion(5);
    cargarResenas();

    return () => {
      // Invalida cualquier solicitud pendiente al cambiar
      // de usuario, gimnasio o desmontar el componente.
      solicitudActual.current += 1;
      contextoActual.current = null;
    };
  }, [authLoading, cargarResenas]);

  // Publica una reseña del cliente.
  async function handlePublicar(event) {
    event.preventDefault();
    const contexto = contextoActual.current;
    if (!contexto || publicacionPendiente.current) return;

    setError("");
    setMensaje("");

    if (!comentario.trim()) {
      setError("Escribe un comentario antes de publicar.");
      return;
    }

    publicacionPendiente.current = true;
    setPublicando(true);

    try {
      await reviewsApi.createReview({
        gymSlug: sedeResena,
        calificacion,
        comentario,
      });
    } catch (err) {
      if (contexto === contextoActual.current) {
        setError(err?.message || "No se pudo publicar la reseña.");
      }
      return;
    } finally {
      publicacionPendiente.current = false;
      if (contextoActual.current) setPublicando(false);
    }

    if (contexto !== contextoActual.current) return;

    setComentario("");
    setCalificacion(5);
    setMensaje("Tu reseña se publicó correctamente.");
    await cargarResenas();
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

      <section className="mx-auto w-full max-w-[1060px] pt-12">

        <p className="mb-3 text-xs font-extrabold tracking-[2.7px] text-[#d5ad55]">
          OPINIONES DE NUESTROS USUARIOS
        </p>

        <h1 className="mb-3 text-4xl font-bold">{sedeResena && rol !== "super_admin" ? `Reseñas de ${datosSede(sedeResena)?.nombre ?? sedeResena}` : "Reseñas"}</h1>

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

        {clienteSinSede && (
          <p role="status" className="mb-10 rounded-xl border border-[rgba(255,196,87,.45)] bg-[rgba(120,86,20,.2)] p-4 text-sm text-[#ffcf70]">
            Tu cuenta de cliente aún no tiene una sede asignada. Cuando tu
            gimnasio te vincule podrás ver y publicar reseñas de tu sede.
          </p>
        )}

        {(rol === "usuario_particular" || (rol === "cliente" && !clienteSinSede)) && (
          <section className="mb-10 rounded-xl border border-[#41433f] bg-[#212320] p-6">
            <h2 className="mb-2 text-xl font-bold">
              Comparte tu experiencia
            </h2>

            <form onSubmit={handlePublicar}>
              <label className="mb-3 block text-sm font-semibold">
                Tu calificación
              </label>

              <div className="mb-5 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    onClick={() => setCalificacion(estrella)}
                    aria-label={`${estrella} de 5`}
                    aria-pressed={calificacion === estrella}
                    className={`min-h-11 min-w-11 rounded-lg border px-2 text-sm font-bold ${
                      estrella === calificacion
                        ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]"
                        : "border-[#41463f] text-[#f2f4ef]"
                    }`}
                  >
                    {estrella} de 5
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
              disabled={cargando}
              className="text-sm text-[#d5ad55] hover:underline disabled:opacity-50"
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
                      {resena.calificacion} de 5
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
