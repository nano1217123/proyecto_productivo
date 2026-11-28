"use client";

import { useLayoutEffect, useRef, useState } from "react";
import reviewsApi from "../api/reviewsApi";
import { motivosDenuncia } from "./DenunciarResena";

const boton = "min-h-11 rounded-md border border-[#41463f] px-3 py-2 text-sm disabled:opacity-50";
const infracciones = Object.entries(motivosDenuncia).filter(([clave]) => clave !== "OTRO");
const etiquetas = {
  PENDIENTE: "Pendiente", DERIVADA: "Derivada", RESUELTA: "Resuelta",
  DERIVAR: "Derivación", RESOLVER: "Resolución", OCULTAR: "Ocultamiento", RESTAURAR: "Restauración",
  REQUIERE_REVISION: "Requiere revisión", SIN_INFRACCION: "Sin infracción", CONTENIDO_CORREGIDO: "Contenido corregido",
  VISIBLE: "Visible", OCULTA: "Oculta",
};
const fecha = valor => new Date(valor).toLocaleString("es-CO");

export default function ColaModeracion({ global, gymSlug, actualizarResenas }) {
  const [vista, setVista] = useState("denuncias");
  const [pagina, setPagina] = useState(1);
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const actual = useRef(null);
  const pendiente = useRef(false);

  useLayoutEffect(() => {
    const solicitud = Symbol();
    actual.current = solicitud;
    setDatos(null);
    setError("");
    reviewsApi.getModerationPage(vista, pagina, gymSlug).then(
      resultado => { if (actual.current === solicitud) setDatos(resultado); },
      () => { if (actual.current === solicitud) setError("No se pudo cargar la cola de moderación."); },
    );
    return () => { actual.current = null; };
  }, [vista, pagina, gymSlug, version]);

  async function guardar(operacion) {
    if (pendiente.current || !actual.current) return;
    const solicitud = actual.current;
    pendiente.current = true;
    setOcupado(true);
    setMensaje("");
    setError("");
    try {
      await operacion();
      if (actual.current !== solicitud) return;
      setMensaje("Decisión registrada.");
      setVersion(numero => numero + 1);
      void actualizarResenas();
    } catch (err) {
      if (actual.current === solicitud) setError(err?.message || "No se pudo registrar la decisión.");
    } finally {
      pendiente.current = false;
      if (actual.current) setOcupado(false);
    }
  }

  function cambiarVista(destino) {
    setVista(destino);
    setPagina(1);
    setMensaje("");
  }

  const filas = datos?.casos ?? datos?.resenas ?? datos?.decisiones;
  return (
    <section className="my-8 grid gap-4" aria-label="Moderación de reseñas">
      <h2 className="text-xl font-bold">Moderación de reseñas</h2>
      {global && <nav aria-label="Vistas de moderación" className="flex flex-wrap gap-2">
        {[["denuncias", "Denuncias abiertas"], ["ocultas", "Reseñas ocultas"], ["decisiones", "Historial de decisiones"]]
          .map(([id, nombre]) => <button type="button" key={id} disabled={ocupado} aria-pressed={vista === id}
            className={boton} onClick={() => cambiarVista(id)}>{nombre}</button>)}
      </nav>}
      {mensaje && <p role="status" className="text-green-300">{mensaje}</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {!datos && !error && <p role="status">Cargando moderación…</p>}
      {error && <button type="button" className={boton} disabled={ocupado}
        onClick={() => setVersion(numero => numero + 1)}>Actualizar moderación</button>}
      {filas?.length === 0 && <p>No hay registros en esta página.</p>}
      {datos?.casos?.map(caso => (
        <article key={caso.id} className="grid gap-2 rounded-xl border border-[#41433f] bg-[#212320] p-4 text-sm">
          <h3 className="font-bold">{motivosDenuncia[caso.motivo]} · {caso.gymSlug}</h3>
          <p>{etiquetas[caso.estado]} · {fecha(caso.creadoEn)}</p>
          {caso.prioritaria && <p className="text-[#ffcf70]">Revisión prioritaria</p>}
          {!caso.resena && <p>La reseña fue eliminada.</p>}
          {global && caso.resena && <>
            <p>{caso.resena.calificacion} de 5 · {etiquetas[caso.resena.visibilidad]}</p>
            <p className="whitespace-pre-wrap break-words">{caso.resena.comentario}</p>
            {caso.resena.revision !== caso.revision && <p>La reseña cambió después de recibir la denuncia.</p>}
          </>}
          {global && caso.descripcion && <p className="whitespace-pre-wrap break-words">Descripción de la denuncia: {caso.descripcion}</p>}
          {global ? <div className="flex flex-wrap gap-2">
            <button type="button" className={boton} disabled={ocupado}
              onClick={() => void guardar(() => reviewsApi.decideReport(caso.id, {
                accion: "RESOLVER", motivo: "SIN_INFRACCION", revision: caso.resena?.revision ?? null,
              }))}>Resolver sin ocultar</button>
            {caso.resena?.visibilidad === "VISIBLE" && <form className="flex flex-wrap gap-2" onSubmit={event => {
              event.preventDefault();
              const motivo = new FormData(event.currentTarget).get("motivo");
              if (motivo && window.confirm("¿Ocultar esta reseña y resolver la denuncia?")) {
                void guardar(() => reviewsApi.decideReport(caso.id, { accion: "OCULTAR", motivo, revision: caso.resena.revision }));
              }
            }}>
              <select name="motivo" aria-label="Motivo del ocultamiento" className="rounded-md bg-[#171817] p-2"
                required disabled={ocupado}>
                <option value="">Motivo del ocultamiento</option>
                {infracciones.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
              </select>
              <button className={boton} disabled={ocupado} type="submit">Ocultar reseña</button>
            </form>}
          </div> : caso.estado === "PENDIENTE" && <button type="button" className={boton} disabled={ocupado}
            onClick={() => void guardar(() => reviewsApi.decideReport(caso.id, {
              accion: "DERIVAR", motivo: "REQUIERE_REVISION", revision: null,
            }))}>Derivar a moderación</button>}
        </article>
      ))}
      {datos?.resenas?.map(resena => (
        <article key={resena.id} className="grid gap-2 rounded-xl border border-[#41433f] bg-[#212320] p-4 text-sm">
          <h3 className="font-bold">{resena.gymSlug} · {resena.calificacion} de 5</h3>
          <p className="whitespace-pre-wrap break-words">{resena.comentario}</p>
          <form className="flex flex-wrap gap-2" onSubmit={event => {
            event.preventDefault();
            const motivo = new FormData(event.currentTarget).get("motivo");
            if (motivo && window.confirm("¿Restaurar la visibilidad de esta reseña?")) {
              void guardar(() => reviewsApi.restoreReview(resena.id, resena.revision, motivo));
            }
          }}>
            <select name="motivo" aria-label="Motivo de la restauración" className="rounded-md bg-[#171817] p-2"
              required disabled={ocupado}>
              <option value="">Motivo de la restauración</option>
              <option value="SIN_INFRACCION">Sin infracción</option>
              <option value="CONTENIDO_CORREGIDO">Contenido corregido</option>
            </select>
            <button type="submit" disabled={ocupado} className={boton}>Restaurar reseña</button>
          </form>
        </article>
      ))}
      {datos?.decisiones?.map(decision => (
        <article key={decision.id} className="rounded-xl border border-[#41433f] bg-[#212320] p-4 text-sm">
          <h3 className="font-bold">{etiquetas[decision.accion]} · {decision.gymSlug}</h3>
          <p>{motivosDenuncia[decision.motivo] ?? etiquetas[decision.motivo]} · {fecha(decision.creadoEn)}</p>
          <p>Responsable: {decision.actorId ?? "Cuenta desvinculada"}</p>
        </article>
      ))}
      {(pagina > 1 || datos?.siguiente) && <nav aria-label="Páginas de moderación" className="flex items-center gap-2">
        <button type="button" className={boton} disabled={ocupado || pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
        <span>Página {pagina}</span>
        <button type="button" className={boton} disabled={ocupado || !datos?.siguiente} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
      </nav>}
    </section>
  );
}
