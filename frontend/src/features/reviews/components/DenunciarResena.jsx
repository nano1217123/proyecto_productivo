"use client";

import { useRef, useState } from "react";
import reviewsApi from "../api/reviewsApi";

export const motivosDenuncia = {
  ACOSO: "Contenido ofensivo o acoso",
  SPAM: "Spam o publicidad",
  DATOS_PERSONALES: "Información personal expuesta",
  FRAUDE: "Engaño o fraude",
  OTRO: "Otro motivo",
};

export default function DenunciarResena({ id }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const ocupado = useRef(false);

  async function enviar(event) {
    event.preventDefault();
    if (!motivo || ocupado.current) return;
    ocupado.current = true;
    setEnviando(true);
    setError("");
    try {
      await reviewsApi.reportReview(id, { motivo, descripcion: descripcion.trim() || undefined });
      setDescripcion("");
      setEnviado(true);
    } catch {
      setError("No se pudo enviar la denuncia. Inténtalo de nuevo.");
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  }

  if (enviado) return <p role="status" className="mt-3 text-sm text-green-300">Denuncia recibida.</p>;
  if (!abierto) return <button type="button" className="mt-3 min-h-11 text-sm underline"
    onClick={() => setAbierto(true)}>Reportar reseña</button>;
  return (
    <form onSubmit={enviar} className="mt-3 grid gap-2 border-t border-[#41433f] pt-3 text-sm">
      <label className="grid gap-1">
        Motivo de la denuncia
        <select required value={motivo} disabled={enviando} className="rounded-md bg-[#171817] p-2"
          onChange={event => setMotivo(event.target.value)}>
          <option value="">Selecciona un motivo</option>
          {Object.entries(motivosDenuncia).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
      </label>
      <label className="grid gap-1">
        Descripción (opcional)
        <textarea value={descripcion} disabled={enviando} maxLength={500}
          className="rounded-md bg-[#171817] p-2" onChange={event => setDescripcion(event.target.value)} />
      </label>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={enviando || !motivo} className="min-h-11 underline disabled:opacity-50">Enviar denuncia</button>
        <button type="button" disabled={enviando} className="min-h-11"
          onClick={() => { setDescripcion(""); setError(""); setAbierto(false); }}>Cancelar</button>
      </div>
    </form>
  );
}
