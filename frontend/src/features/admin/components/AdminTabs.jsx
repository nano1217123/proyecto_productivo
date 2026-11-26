"use client";

export default function AdminTabs({ tabActiva, setTabActiva, esSuperAdmin, esAdmin }) {
  return (
    <nav className="flex flex-wrap gap-2.5 mb-6 border-b border-[#30332f] pb-3">
      <button
        className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "miembros" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
        onClick={() => setTabActiva("miembros")}
      >
        👥 Miembros & Suscripciones
      </button>

      <button
        className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "clientes" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
        onClick={() => setTabActiva("clientes")}
      >
        🏷️ Clientes de la sede
      </button>

     <button
        className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "imagenes" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
        onClick={() => setTabActiva("imagenes")}
      >
        📸 Subir Imágenes
      </button>
      
      <button
        className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "comunicacion" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
        onClick={() => setTabActiva("comunicacion")}
      >
        📢 Anuncios (Correo)
      </button>

      <button
        className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "configuracion" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
        onClick={() => setTabActiva("configuracion")}
      >
        ⚙️ Perfil de Sede
      </button>

      {/* Solo el admin de sede paga su suscripción (no super_admin ni cliente). */}
      {esAdmin && (
        <button
          type="button"
          aria-current={tabActiva === "suscripcion" ? "page" : undefined}
          className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff] ${tabActiva === "suscripcion" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
          onClick={() => setTabActiva("suscripcion")}
        >
          💳 Suscripción
        </button>
      )}

      {esSuperAdmin && (
        <button
          className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "crear-admin" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
          onClick={() => setTabActiva("crear-admin")}
        >
          🛡️ Asignar Administrador
        </button>
      )}
    </nav>
  );
}
