"use client";

export default function CommunicationTab({
  correoTarget, setCorreoTarget,
  asuntoCorreo, setAsuntoCorreo,
  mensajeCorreo, setMensajeCorreo,
  enviandoCorreo, enviarAnuncio
}) {
  return (
    <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
      <h2 className="text-xl mt-0 mb-2">Comunicación con Miembros</h2>
      <p className="text-sm text-[#a9afa7] mb-6">
        Envía anuncios por correo electrónico utilizando la integración con Resend.
      </p>

      <form onSubmit={enviarAnuncio} className="max-w-[600px]">
        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
          <label>Audiencia destino</label>
          <select value={correoTarget} onChange={(e) => setCorreoTarget(e.target.value)}>
            <option value="por_vencer">Próximos a Vencer (Recordatorio de pago)</option>
            <option value="activo">Solo Miembros Activos</option>
            <option value="todos">Todos los miembros de esta sede</option>
          </select>
        </div>

        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
          <label>Asunto del correo</label>
          <input
            type="text"
            placeholder="Ej: ¡Tu suscripción vence pronto! / Aviso de feriado"
            value={asuntoCorreo}
            onChange={(e) => setAsuntoCorreo(e.target.value)}
            required
          />
        </div>

        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
          <label>Mensaje</label>
          <textarea
            rows={5}
            className="w-full p-3 rounded-[10px] bg-[#151714] border border-[#41463f] text-[#f2f4ef] outline-none focus:border-[#b56cff]"
            placeholder="Escribe aquí el cuerpo del correo..."
            value={mensajeCorreo}
            onChange={(e) => setMensajeCorreo(e.target.value)}
            required
          />
        </div>

        <button className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={enviandoCorreo}>
          {enviandoCorreo ? "Enviando con Resend..." : "Enviar Anuncio"}
        </button>
      </form>
    </section>
  );
}
