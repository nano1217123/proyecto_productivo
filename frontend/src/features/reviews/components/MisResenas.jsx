"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import reviewsApi from "../api/reviewsApi";

const boton = "rounded-md border border-[#41463f] px-3 py-2 text-sm disabled:opacity-50";

export default function MisResenas({ nombreSede, version, alCambiar, ocupado, iniciarGestion, finalizarGestion }) {
  const [resenas, setResenas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [borrador, setBorrador] = useState(null);
  const contexto = useRef(null);
  const solicitud = useRef(0);

  useLayoutEffect(() => {
    contexto.current = Symbol();
    return () => { contexto.current = null; };
  }, []);

  const cargar = useCallback(async () => {
    const actual = contexto.current;
    const numero = ++solicitud.current;
    const vigente = () => actual === contexto.current && numero === solicitud.current;
    setCargando(true);
    setErrorCarga("");
    try {
      const datos = await reviewsApi.getOwnReviews();
      if (vigente()) setResenas(datos);
    } catch {
      if (vigente()) setErrorCarga("No se pudieron cargar tus reseñas.");
    } finally {
      if (vigente()) setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar, version]);

  async function modificar(resena, eliminar) {
    const actual = contexto.current;
    if (!actual || ocupado) return;
    if (eliminar && !window.confirm("¿Eliminar esta reseña?")) return;
    if (!iniciarGestion()) return;
    setErrorAccion("");
    let revalidar = false;
    try {
      const resultado = eliminar
        ? await reviewsApi.deleteOwnReview(resena.id)
        : await reviewsApi.updateOwnReview(resena.id, borrador);
      if (actual !== contexto.current) {
        revalidar = true;
        return;
      }
      setResenas(filas => eliminar
        ? filas.filter(fila => fila.id !== resena.id)
        : filas.map(fila => fila.id === resena.id ? resultado : fila));
      setBorrador(null);
      // La nueva lectura invalida las anteriores y recoge cambios de otras solicitudes.
      void cargar();
      void alCambiar();
    } catch (err) {
      if (actual === contexto.current) {
        setErrorAccion(err?.message || "No se pudo completar la operación.");
      }
    } finally {
      finalizarGestion(revalidar);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="mis-resenas">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="mis-resenas" className="text-xl font-bold">Mis reseñas</h2>
        <button type="button" className={boton} disabled={cargando || ocupado} onClick={cargar}>
          Actualizar mis reseñas
        </button>
      </div>
      {cargando && <p role="status">Cargando tus reseñas…</p>}
      {errorCarga && <p role="alert" className="text-red-300">{errorCarga}</p>}
      {errorAccion && <p role="alert" className="mb-4 text-red-300">{errorAccion}</p>}
      {!cargando && !errorCarga && resenas.length === 0 && <p>Todavía no has publicado reseñas.</p>}
      <div className="grid gap-4">
        {resenas.map(resena => (
          <article key={resena.id} className="rounded-xl border border-[#41433f] bg-[#212320] p-5">
            <h3 className="font-bold">{nombreSede(resena.gym_slug)}</h3>
            {resena.estado_moderacion === "OCULTA" && <p className="text-sm text-[#ffcf70]">
              Oculta por moderación. Puedes editarla y seguirá oculta hasta que moderación la restaure.
            </p>}
            <time dateTime={resena.creado_en} className="text-xs text-[#a9afa7]">
              {new Date(resena.creado_en).toLocaleDateString("es-CO")}
            </time>
            {borrador?.id === resena.id ? (
              <form className="mt-3 grid gap-3" onSubmit={event => {
                event.preventDefault();
                void modificar(resena, false);
              }}>
                <label className="grid gap-1 text-sm">
                  Calificación
                  <select className={boton} value={borrador.calificacion} disabled={ocupado}
                    onChange={event => setBorrador({ ...borrador, calificacion: Number(event.target.value) })}>
                    {[1, 2, 3, 4, 5].map(nota => <option key={nota} value={nota}>{nota} de 5</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Comentario
                  <textarea className={boton} value={borrador.comentario} maxLength={1000} required disabled={ocupado}
                    onChange={event => setBorrador({ ...borrador, comentario: event.target.value })} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className={boton} type="submit" disabled={ocupado}>Guardar cambios</button>
                  <button className={boton} type="button" disabled={ocupado} onClick={() => {
                    setBorrador(null);
                    setErrorAccion("");
                  }}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <p className="mt-2 font-semibold text-[#d5ad55]">{resena.calificacion} de 5</p>
                <p className="whitespace-pre-wrap break-words">{resena.comentario}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={boton} type="button" disabled={ocupado || Boolean(borrador)} onClick={() => {
                    setErrorAccion("");
                    setBorrador({ id: resena.id, calificacion: resena.calificacion, comentario: resena.comentario ?? "" });
                  }}>Editar</button>
                  <button className={boton} type="button" disabled={ocupado || Boolean(borrador)}
                    onClick={() => void modificar(resena, true)}>Eliminar</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
