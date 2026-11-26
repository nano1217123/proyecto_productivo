"use client";

import NoDisponible from "./NoDisponible";

// El backend todavía no tiene un endpoint para enviar anuncios a los
// clientes de una sede (lib/email.ts solo envía verificación y
// restablecimiento de contraseña). No se muestra un formulario que
// aparente enviar correos.
export default function CommunicationTab({ nombreSede }) {
  return (
    <section
      aria-labelledby="comunicacion-titulo"
      className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]"
    >
      <h2 id="comunicacion-titulo" className="text-xl mt-0 mb-2">
        Anuncios por correo
      </h2>
      <p className="text-sm text-[#a9afa7] mb-5 max-w-[600px]">
        Enviar avisos por correo a los clientes
        {nombreSede ? ` de ${nombreSede}` : " de tu sede"}.
      </p>
      <NoDisponible titulo="El envío de anuncios aún no está conectado.">
        <p>
          Por ahora la plataforma no envía correos a los clientes de la sede.
          Mientras tanto, avísales por los canales habituales del gimnasio.
        </p>
      </NoDisponible>
    </section>
  );
}
