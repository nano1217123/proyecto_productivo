"use client";

export default function AdminTabs({ tabActiva, setTabActiva, esSuperAdmin }) {
  return (
    <nav className="flex gap-2.5 mb-6 border-b border-[#30332f] pb-3">
      <button
        className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "miembros" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
        onClick={() => setTabActiva("miembros")}
      >
        👥 Miembros & Suscripciones
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

      {esSuperAdmin && (
        <button
          className={`px-[18px] py-2.5 rounded-lg border font-bold cursor-pointer transition ${tabActiva === "crear-admin" ? "border-[#b56cff] bg-[#321d47] text-[#d7adff]" : "border-[#41463f] bg-[#151714] text-[#a9afa7]"}`}
          onClick={() => setTabActiva("crear-admin")}
        >
          🛡️ Crear Administrador
        </button>
      )}
    </nav>
  );
}
