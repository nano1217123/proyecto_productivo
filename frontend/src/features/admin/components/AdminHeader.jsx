"use client";

export default function AdminHeader({ gymSeleccionado, setGymSeleccionado, gimnasios, logout }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-5 mb-8">
      <div>
        <span className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">PANEL DE ADMINISTRACIÓN</span>
        <h1 className="m-1 text-[clamp(28px,4vw,42px)] tracking-[-1.2px]">Gestión de Sede</h1>
      </div>

      <div className="flex items-center gap-2.5 p-2 px-3.5 border border-[#41433f] rounded-[10px] bg-[#212320] [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#a9afa7] [&_select]:border-0 [&_select]:outline-0 [&_select]:bg-transparent [&_select]:text-[#d7adff] [&_select]:font-bold [&_select]:text-sm">
        <label htmlFor="select-gym">Sede actual:</label>
        <select
          id="select-gym"
          value={gymSeleccionado}
          onChange={(e) => setGymSeleccionado(e.target.value)}
        >
        {gimnasios.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={logout}
        className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
