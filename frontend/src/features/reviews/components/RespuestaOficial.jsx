"use client";

import { useState } from "react";

const boton = "rounded-md border border-[#41463f] px-3 py-2 text-sm disabled:opacity-50";

export default function RespuestaOficial({ respuesta, gestionar, ocupado }) {
  const [borrador, setBorrador] = useState(null);
  const [error, setError] = useState("");

  async function guardar(accion) {
    setError("");
    try {
      const completada = await gestionar(accion, borrador);
      if (completada) setBorrador(null);
    } catch (err) {
      setError(err?.message || "No se pudo guardar el cambio en la respuesta.");
    }
  }

  if (!respuesta && !gestionar) return null;
  return (
    <div className="mt-4 border-l-2 border-[#b56cff] pl-4">
      {respuesta && (
        <>
          <p className="text-sm font-bold text-[#d7adff]">Respuesta oficial del gimnasio</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-6">{respuesta.texto}</p>
        </>
      )}
      {gestionar && (
        <>
          {!respuesta && <p className="text-sm text-[#ffcf70]">Pendiente de respuesta</p>}
          {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
          {borrador !== null ? (
            <form className="mt-3 grid gap-2" onSubmit={event => {
              event.preventDefault();
              if (borrador.trim()) void guardar(respuesta ? "editar" : "publicar");
            }}>
              <label className="grid gap-1 text-sm">
                Respuesta del gimnasio
                <textarea className="rounded-md border border-[#41463f] bg-[#171817] p-2"
                  value={borrador} onChange={event => setBorrador(event.target.value)}
                  required maxLength={1000} rows={3} disabled={ocupado} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={boton} disabled={ocupado || !borrador.trim()}>Guardar respuesta</button>
                <button type="button" className={boton} disabled={ocupado} onClick={() => {
                  setError("");
                  setBorrador(null);
                }}>Cancelar</button>
              </div>
            </form>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={boton} disabled={ocupado} onClick={() => {
                setError("");
                setBorrador(respuesta?.texto ?? "");
              }}>{respuesta ? "Editar respuesta" : "Responder"}</button>
              {respuesta && <button type="button" className={boton} disabled={ocupado} onClick={() => {
                if (window.confirm("¿Retirar la respuesta oficial?")) void guardar("retirar");
              }}>Retirar respuesta</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
