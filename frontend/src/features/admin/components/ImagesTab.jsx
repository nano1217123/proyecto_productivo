"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { muscleGroupBySlug } from "@/src/features/exercises/lib/muscleGroups";
import { etiquetasEjercicios, useImageAssignment } from "../hooks/useImageAssignment";

const ESTILO_FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";
const ESTILO_CAMPO = `w-full p-2.5 bg-[#151714] border border-[#41463f] rounded-[10px] text-[#f2f4ef] text-sm focus:border-[#b56cff] disabled:opacity-60 disabled:cursor-not-allowed ${ESTILO_FOCO}`;
const ESTILO_ETIQUETA = "block mb-2 text-[13px] font-semibold text-[#c0c7bd]";
const ESTILO_BOTON = `px-4 py-2.5 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer transition hover:bg-[#d7adff] disabled:opacity-60 disabled:cursor-not-allowed ${ESTILO_FOCO}`;
const ESTILO_ERROR = "p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]";
const ESTILO_EXITO = "p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px]";

function MiniaturaImagen({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full max-w-[220px] aspect-square object-cover rounded-lg border border-[#41433f] bg-[#151714]"
    />
  );
}

export default function ImagesTab() {
  const {
    estadoCatalogo, errorCatalogo, grupos, grupoSlug, ejercicioId, archivo, errorArchivo,
    fase, errorEnvio, destinoEnvio, enviando,
    recargarCatalogo, seleccionarGrupo, seleccionarEjercicio, seleccionarArchivo, enviar, reintentarAsignacion,
  } = useImageAssignment();
  const ids = { grupo: useId(), ejercicio: useId(), archivo: useId(), ayudaArchivo: useId() };
  const archivoRef = useRef(null);
  const resultadoRef = useRef(null);
  const reintentarRef = useRef(null);
  const [vistaPrevia, setVistaPrevia] = useState("");

  const grupo = grupos.find((g) => g.slug === grupoSlug) || null;
  const ejercicios = grupo?.ejercicios || [];
  const opciones = useMemo(() => etiquetasEjercicios(ejercicios), [ejercicios]);
  const ejercicio = ejercicios.find((e) => String(e.id) === ejercicioId) || null;
  const etiquetaEjercicio = opciones.find((o) => String(o.id) === ejercicioId)?.etiqueta || ejercicio?.nombre;
  const catalogoListo = estadoCatalogo === "listo";
  // La vista del grupo solo existe para los grupos de la lista estática. Con
  // el slug de la API abre directamente el ejercicio; si no hay slug, el grupo.
  const enlaceCatalogo = grupo && muscleGroupBySlug[grupo.slug]
    ? `/dashboard/ejercicios/${encodeURIComponent(grupo.slug)}${ejercicio?.slug ? `?ejercicio=${encodeURIComponent(ejercicio.slug)}` : ""}`
    : null;

  // URL de objeto para la vista previa: se libera al cambiar de archivo y al desmontar.
  useEffect(() => {
    if (!archivo) { setVistaPrevia(""); return undefined; }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  // Tras un éxito el archivo se limpia: vacía también el control nativo.
  useEffect(() => {
    if (!archivo && archivoRef.current) archivoRef.current.value = "";
  }, [archivo]);

  // Foco tras resolver: el botón de envío queda deshabilitado tras un éxito.
  useEffect(() => {
    if (fase === "exito") resultadoRef.current?.focus();
    if (fase === "error-asignacion") reintentarRef.current?.focus();
  }, [fase]);

  function alEnviar(evento) {
    evento.preventDefault();
    enviar();
  }

  const textoBoton = fase === "subiendo" ? "Subiendo imagen..." : fase === "asignando" ? "Asignando imagen..." : "Subir y asignar imagen";

  return (
    <section aria-labelledby="titulo-imagenes" className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
      <h2 id="titulo-imagenes" className="text-xl mt-0 mb-2">Imágenes de ejercicios</h2>
      <p className="text-sm text-[#a9afa7] mb-6 max-w-[680px]">
        Elige el ejercicio del catálogo y sube su imagen. El catálogo es compartido: la imagen se verá en todas
        las sedes, sin importar la sede seleccionada en el panel.
      </p>

      {estadoCatalogo === "cargando" && !errorCatalogo && (
        <p role="status" className="text-sm text-[#a9afa7]">Cargando catálogo de ejercicios...</p>
      )}

      {errorCatalogo && estadoCatalogo !== "listo" && (
        <div className={`${ESTILO_ERROR} mb-4 max-w-[680px]`}>
          <p role="alert" className="m-0 mb-3">{errorCatalogo}</p>
          <button
            type="button"
            onClick={() => estadoCatalogo !== "cargando" && recargarCatalogo()}
            aria-disabled={estadoCatalogo === "cargando"}
            className={`${ESTILO_BOTON} aria-disabled:opacity-60 aria-disabled:cursor-wait`}
          >
            {estadoCatalogo === "cargando" ? "Cargando catálogo..." : "Reintentar carga del catálogo"}
          </button>
        </div>
      )}

      {catalogoListo && grupos.length === 0 && (
        <p role="status" className="text-sm text-[#a9afa7]">El catálogo no tiene ejercicios todavía.</p>
      )}

      {catalogoListo && grupos.length > 0 && (
        <form onSubmit={alEnviar} aria-busy={enviando} className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[960px]">
          <div className="grid gap-4 content-start">
            <div>
              <label htmlFor={ids.grupo} className={ESTILO_ETIQUETA}>Grupo muscular</label>
              <select
                id={ids.grupo}
                value={grupoSlug}
                onChange={(e) => seleccionarGrupo(e.target.value)}
                disabled={enviando}
                className={ESTILO_CAMPO}
              >
                <option value="">Selecciona un grupo</option>
                {grupos.map((g) => <option key={g.slug} value={g.slug}>{g.nombre}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor={ids.ejercicio} className={ESTILO_ETIQUETA}>Ejercicio</label>
              <select
                id={ids.ejercicio}
                value={ejercicioId}
                onChange={(e) => seleccionarEjercicio(e.target.value)}
                disabled={enviando || !grupo}
                className={ESTILO_CAMPO}
              >
                <option value="">{grupo ? "Selecciona un ejercicio" : "Primero elige un grupo"}</option>
                {opciones.map((o) => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor={ids.archivo} className={ESTILO_ETIQUETA}>Nueva imagen</label>
              <input
                id={ids.archivo}
                ref={archivoRef}
                type="file"
                accept="image/*"
                onChange={(e) => seleccionarArchivo(e.target.files?.[0] || null)}
                disabled={enviando || !ejercicio}
                aria-describedby={ids.ayudaArchivo}
                aria-invalid={Boolean(errorArchivo)}
                className={ESTILO_CAMPO}
              />
              <p id={ids.ayudaArchivo} className="m-0 mt-1.5 text-[11px] text-[#6f756b]">
                {ejercicio ? "Formato de imagen (JPG, PNG, WebP…), máximo 5 MB." : "Elige un ejercicio para seleccionar la imagen."}
              </p>
              {errorArchivo && <p role="alert" className="m-0 mt-2 text-[13px] text-[#ff7979]">{errorArchivo}</p>}
            </div>
          </div>

          <div className="grid gap-4 content-start" aria-live="polite">
            {ejercicio ? (
              <div className="p-4 border border-[#41433f] rounded-lg bg-[#151714] grid gap-3">
                <p className="m-0 text-sm">
                  <span className="text-[#a9afa7]">Destino:</span>{" "}
                  <strong className="text-[#f2f4ef]">{grupo.nombre} · {etiquetaEjercicio}</strong>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <figure className="m-0">
                    <figcaption className="mb-1.5 text-xs font-semibold text-[#a9afa7]">Imagen actual</figcaption>
                    {ejercicio.imagen_url
                      ? <MiniaturaImagen src={ejercicio.imagen_url} alt={`Imagen actual de ${ejercicio.nombre}`} />
                      : <p className="m-0 text-xs text-[#a9afa7]">Este ejercicio todavía no tiene imagen.</p>}
                  </figure>
                  {vistaPrevia && (
                    <figure className="m-0">
                      <figcaption className="mb-1.5 text-xs font-semibold text-[#a9afa7]">Nueva imagen (vista previa)</figcaption>
                      <MiniaturaImagen src={vistaPrevia} alt={`Vista previa de la nueva imagen para ${ejercicio.nombre}`} />
                    </figure>
                  )}
                </div>

                {enlaceCatalogo && (
                  <Link href={enlaceCatalogo} target="_blank" rel="noopener noreferrer" className={`justify-self-start text-[13px] font-bold text-[#d7adff] underline rounded-sm ${ESTILO_FOCO}`}>
                    {ejercicio.slug ? "Ver en el catálogo" : "Ver grupo en el catálogo"}
                  </Link>
                )}

                {ejercicio.imagen_url && archivo && fase !== "exito" && (
                  <p className="m-0 p-[10px_12px] rounded-lg border border-[rgba(255,196,87,.45)] bg-[rgba(120,86,20,.2)] text-[#ffcf70] text-[13px]">
                    Esta acción reemplazará la imagen actual de <strong>{etiquetaEjercicio}</strong> ({grupo.nombre}) en el
                    catálogo compartido de todas las sedes.
                  </p>
                )}
              </div>
            ) : (
              <p className="m-0 p-4 border border-dashed border-[#41433f] rounded-lg text-sm text-[#a9afa7]">
                Elige un grupo y un ejercicio para ver el destino de la imagen.
              </p>
            )}

            <button type="submit" disabled={enviando || !archivo || !ejercicio} className={`${ESTILO_BOTON} w-full sm:w-auto sm:justify-self-start`}>
              {textoBoton}
            </button>

            {enviando && <p role="status" className="m-0 text-[13px] text-[#a9afa7]">{textoBoton}</p>}

            {fase === "error-subida" && (
              <p role="alert" className={`${ESTILO_ERROR} m-0`}>
                No se pudo subir la imagen: {errorEnvio} El ejercicio no se modificó. Puedes volver a intentarlo.
              </p>
            )}

            {fase === "error-asignacion" && destinoEnvio && (
              <div className={ESTILO_ERROR}>
                <p role="alert" className="m-0 mb-3">
                  La imagen se subió, pero no se asignó a <strong>{destinoEnvio.ejercicioNombre}</strong> ({destinoEnvio.grupoNombre}): {errorEnvio}
                </p>
                <button ref={reintentarRef} type="button" onClick={reintentarAsignacion} className={ESTILO_BOTON}>
                  Reintentar asignación
                </button>
              </div>
            )}

            {fase === "exito" && destinoEnvio && (
              <p ref={resultadoRef} tabIndex={-1} role="status" className={`${ESTILO_EXITO} m-0 ${ESTILO_FOCO}`}>
                Imagen asignada a <strong>{destinoEnvio.ejercicioNombre}</strong> ({destinoEnvio.grupoNombre}).
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
