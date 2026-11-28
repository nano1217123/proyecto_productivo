
"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import reviewsApi from "../api/reviewsApi";
import MisResenas from "../components/MisResenas";
import ResumenResenas from "../components/ResumenResenas";
import RespuestaOficial from "../components/RespuestaOficial";
import VotoUtil from "../components/VotoUtil";
import DenunciarResena from "../components/DenunciarResena";
import ColaModeracion from "../components/ColaModeracion";

const filtrosIniciales = { buscar: "", calificacion: "", orden: "recientes" };
const consultaInicial = { ...filtrosIniciales, pagina: 1 };
const campoFiltro = "rounded-md border border-[#41463f] bg-[#171817] px-3 py-2";

export default function ReviewsPage({ gym }) {
  const { user, loading: authLoading } = useAuth();
  const { sedes, sede: datosSede, error: errorSedes } = useSedes();
  const router = useRouter();

  const [{ resenas, estadisticas, paginacion }, setResultado] = useState({ resenas: [] });
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorConsulta, setErrorConsulta] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [versionPropias, setVersionPropias] = useState(0);
  const [gestionandoPropias, setGestionandoPropias] = useState(false);
  const [votosPendientes, setVotosPendientes] = useState(new Set());
  const [erroresVoto, setErroresVoto] = useState({});

  const solicitudActual = useRef(0);
  const contextoActual = useRef(null);
  const publicacionPendiente = useRef(false);
  const gestionPendiente = useRef(false);
  const votosEnCurso = useRef(new Set());
  const usuarioId = user?.idusuario;
  const rol = user?.tipo_usuario;
  const esAdmin = rol === "admin";
  const esSuperAdmin = rol === "super_admin";
  const esParticular = rol === "usuario_particular";
  const sedesDisponibles = esAdmin ? user.sedes_administradas ?? []
    : esParticular ? sedes.map(sede => sede.slug) : [];
  // Para clientes, el perfil del servidor define la sede de consulta y publicación.
  const sedeResena = rol === "cliente" ? user.sede ?? null
    : sedesDisponibles.includes(gym) ? gym : null;
  const clienteSinSede = rol === "cliente" && !sedeResena;
  const puedePublicar = Boolean(sedeResena) && (rol === "cliente" || esParticular);
  const puedeConsultar = Boolean(sedeResena) || esSuperAdmin;

  function cambiarSede(slug) {
    const query = new URLSearchParams();
    if (slug) query.set("gym", slug);
    if (esParticular) query.set("modo", "casa");
    router.replace("/dashboard/resenas" + (query.size ? "?" + query : ""));
  }

  // Carga las reseñas según el rol del usuario.
  const cargarResenas = useCallback(async (consulta = contextoActual.current?.consulta ?? consultaInicial) => {
    const solicitud = ++solicitudActual.current;
    const contexto = contextoActual.current;
    const revisionVotos = contexto?.revisionVotos ?? 0;
    if (contexto) contexto.consulta = consulta;

    if (!usuarioId || (rol !== "super_admin" && !sedeResena)) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setErrorConsulta("");

    try {
      const resultado =
        rol === "super_admin"
          ? { resenas: await reviewsApi.getAllReviews() }
          : await (rol === "admin" ? reviewsApi.getAdminReviewPage(sedeResena, consulta)
            : reviewsApi.getPublicReviewPage(sedeResena, consulta));

      // Evita actualizar la pantalla con respuestas antiguas.
      if (solicitud === solicitudActual.current) {
        setResultado({ ...resultado, resenas: resultado.resenas.map(resena => {
          const confirmado = contexto?.votosConfirmados.get(resena.id);
          return confirmado && confirmado.revision > revisionVotos ? { ...resena, ...confirmado.voto } : resena;
        }) });
        if (contexto && resultado.paginacion) contexto.consulta = { ...consulta, pagina: resultado.paginacion.pagina };
      }
    } catch {
      if (solicitud === solicitudActual.current) {
        setErrorConsulta("No se pudieron cargar las reseñas. Puedes volver a actualizar el listado.");
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

    contextoActual.current = {
      usuarioId, sedeResena, cargarResenas, consulta: consultaInicial, revisionVotos: 0, votosConfirmados: new Map(),
    };
    setPublicando(publicacionPendiente.current);
    setGestionandoPropias(gestionPendiente.current);
    setVotosPendientes(new Set(votosEnCurso.current));
    setErroresVoto({});
    setResultado({ resenas: [] });
    setFiltros(filtrosIniciales);
    setErrorConsulta("");
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
  }, [authLoading, usuarioId, cargarResenas]);

  function iniciarGestionPropias() {
    if (!contextoActual.current || gestionPendiente.current) return false;
    gestionPendiente.current = true;
    setGestionandoPropias(true);
    return true;
  }

  async function cambiarVoto(resena, marcar) {
    const contexto = contextoActual.current;
    const clave = JSON.stringify([usuarioId, resena.id]);
    if (!contexto || !resena.puede_votar || votosEnCurso.current.has(clave)) return;
    votosEnCurso.current.add(clave);
    setVotosPendientes(new Set(votosEnCurso.current));
    setErroresVoto(errores => ({ ...errores, [resena.id]: "" }));
    try {
      const voto = await reviewsApi.setHelpfulVote(resena.id, marcar);
      const actual = contextoActual.current;
      if (actual !== contexto) {
        if (actual?.usuarioId === usuarioId && actual.sedeResena === sedeResena) void actual.cargarResenas();
        return;
      }
      contexto.votosConfirmados.set(resena.id, { voto, revision: ++contexto.revisionVotos });
      setResultado(resultado => ({
        ...resultado,
        resenas: resultado.resenas.map(fila => fila.id === resena.id ? { ...fila, ...voto } : fila),
      }));
    } catch (err) {
      if (contexto === contextoActual.current) {
        setErroresVoto(errores => ({ ...errores, [resena.id]: err?.message || "No se pudo guardar tu voto." }));
      }
    } finally {
      votosEnCurso.current.delete(clave);
      if (contextoActual.current) setVotosPendientes(new Set(votosEnCurso.current));
    }
  }

  function finalizarGestionPropias(revalidar) {
    gestionPendiente.current = false;
    const consulta = contextoActual.current;
    if (!consulta) return;
    setGestionandoPropias(false);
    if (revalidar && consulta.usuarioId === usuarioId) {
      setVersionPropias(version => version + 1);
      void consulta.cargarResenas();
    }
  }

  async function gestionarRespuesta(id, accion, texto) {
    if (!esAdmin || !sedeResena || !iniciarGestionPropias()) return false;
    const contexto = contextoActual.current;
    let completada = false;
    try {
      await reviewsApi.manageOfficialReply(id, accion, texto);
      completada = true;
      if (contexto === contextoActual.current) await cargarResenas();
      return contexto === contextoActual.current;
    } catch (err) {
      if (contexto === contextoActual.current) throw err;
      return false;
    } finally {
      finalizarGestionPropias(completada && contexto !== contextoActual.current);
    }
  }

  // Publica una reseña del cliente.
  async function handlePublicar(event) {
    event.preventDefault();
    const contexto = contextoActual.current;
    if (!contexto || !puedePublicar || publicacionPendiente.current) return;

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
    setVersionPropias(version => version + 1);
    await cargarResenas();
  }

  if (authLoading) {
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

        {(esAdmin || esParticular) && (
          <label className="mb-5 flex flex-wrap items-center gap-3 text-sm">
            Sede
            <select value={sedeResena ?? ""} onChange={event => cambiarSede(event.target.value)}
              disabled={sedesDisponibles.length === 0}
              className="rounded-lg border border-[#41463f] bg-[#171817] px-3 py-2">
              <option value="">Selecciona una sede</option>
              {sedesDisponibles.map(slug => <option key={slug} value={slug}>{datosSede(slug)?.nombre ?? slug}</option>)}
            </select>
          </label>
        )}
        {esAdmin && sedesDisponibles.length === 0 && (
          <p role="status" className="mb-5">Tu cuenta aún no tiene sedes asignadas para administrar.</p>
        )}
        {esParticular && errorSedes && (
          <p role="status" className="mb-5">No se pudieron cargar las sedes disponibles.</p>
        )}
        {(esSuperAdmin || (esAdmin && sedesDisponibles.length > 0)) && (
          <Link className="mb-5 inline-block underline" href={`/dashboard/reportes${sedeResena ? "?gym=" + encodeURIComponent(sedeResena) : ""}`}>
            Reportes de reseñas
          </Link>
        )}

        {puedePublicar && (
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

        {puedeConsultar && <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              {rol === "super_admin"
                ? "Todas las reseñas"
                : esAdmin ? "Gestión de reseñas" : "Opiniones de la comunidad"}
            </h2>

            <button
              type="button"
              onClick={() => cargarResenas()}
              disabled={cargando}
              className="text-sm text-[#d5ad55] hover:underline disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>

          {estadisticas && <ResumenResenas estadisticas={estadisticas} />}
          {!esSuperAdmin && (
            <form aria-label="Filtros de reseñas" className="mb-5 flex flex-wrap items-end gap-3"
              onSubmit={event => {
                event.preventDefault();
                void cargarResenas({ ...filtros, buscar: filtros.buscar.trim(), pagina: 1 });
              }}>
              <label className="grid gap-1 text-sm">
                Buscar en comentarios
                <input type="search" className={campoFiltro} maxLength={120} value={filtros.buscar}
                  onChange={event => setFiltros({ ...filtros, buscar: event.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">
                Calificación
                <select className={campoFiltro} value={filtros.calificacion}
                  onChange={event => setFiltros({ ...filtros, calificacion: event.target.value })}>
                  <option value="">Todas</option>
                  {[5, 4, 3, 2, 1].map(nota => <option key={nota} value={nota}>{nota} de 5</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Ordenar por
                <select className={campoFiltro} value={filtros.orden}
                  onChange={event => setFiltros({ ...filtros, orden: event.target.value })}>
                  <option value="recientes">Más recientes</option>
                  <option value="antiguas">Más antiguas</option>
                  <option value="mejor">Mejor calificación</option>
                  <option value="peor">Peor calificación</option>
                </select>
              </label>
              {esAdmin && <label className="grid gap-1 text-sm">
                Estado de respuesta
                <select className={campoFiltro} value={filtros.estadoRespuesta ?? ""}
                  onChange={event => setFiltros({ ...filtros, estadoRespuesta: event.target.value })}>
                  <option value="">Todas</option>
                  <option value="pendiente">Pendientes de respuesta</option>
                  <option value="respondida">Respondidas</option>
                </select>
              </label>}
              <button type="submit" className={campoFiltro}>Aplicar filtros</button>
              <button type="button" className={campoFiltro} onClick={() => {
                setFiltros(filtrosIniciales);
                void cargarResenas(consultaInicial);
              }}>Restablecer filtros</button>
            </form>
          )}

          {cargando ? <p role="status">Cargando reseñas…</p> : errorConsulta ? (
            <p role="alert" className="text-red-300">{errorConsulta}</p>
          ) : resenas.length === 0 ? (
            <div className="rounded-xl border border-[#41433f] bg-[#212320] p-6 text-sm text-[#a9afa7]">
              {estadisticas?.total ? "Ninguna reseña coincide con los filtros." : "Todavía no hay reseñas disponibles."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {resenas.map((resena) => (
                <article
                  key={JSON.stringify([usuarioId, rol, sedeResena, resena.id])}
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
                  <RespuestaOficial respuesta={resena.respuesta} ocupado={gestionandoPropias}
                    gestionar={esAdmin ? (accion, texto) => gestionarRespuesta(resena.id, accion, texto) : undefined} />
                  <VotoUtil resena={resena} error={erroresVoto[resena.id]}
                    pendiente={votosPendientes.has(JSON.stringify([usuarioId, resena.id]))}
                    alCambiar={marcar => cambiarVoto(resena, marcar)} />
                  {resena.puede_denunciar && <DenunciarResena id={resena.id} />}

                  {rol === "super_admin" && (
                    <p className="mt-4 text-xs text-[#a9afa7]">
                      Gimnasio: {resena.gym_slug}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          {!cargando && !errorConsulta && paginacion?.paginas > 1 && (
            <nav aria-label="Páginas de reseñas" className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <button type="button" className={campoFiltro + " disabled:opacity-50"} disabled={paginacion.pagina <= 1}
                onClick={() => void cargarResenas({ ...contextoActual.current.consulta, pagina: paginacion.pagina - 1 })}>
                Anterior
              </button>
              <span>Página {paginacion.pagina} de {paginacion.paginas}</span>
              <button type="button" className={campoFiltro + " disabled:opacity-50"} disabled={paginacion.pagina >= paginacion.paginas}
                onClick={() => void cargarResenas({ ...contextoActual.current.consulta, pagina: paginacion.pagina + 1 })}>
                Siguiente
              </button>
            </nav>
          )}
        </section>}
        {(esSuperAdmin || (esAdmin && sedeResena)) && <ColaModeracion
          key={JSON.stringify([usuarioId, rol, sedeResena])} global={esSuperAdmin}
          gymSlug={sedeResena ?? undefined} actualizarResenas={cargarResenas} />}
        <MisResenas key={JSON.stringify([usuarioId, rol, sedeResena])} version={versionPropias}
          nombreSede={slug => datosSede(slug)?.nombre ?? slug} alCambiar={cargarResenas}
          ocupado={gestionandoPropias} iniciarGestion={iniciarGestionPropias} finalizarGestion={finalizarGestionPropias} />
      </section>
    </main>
  );
}
