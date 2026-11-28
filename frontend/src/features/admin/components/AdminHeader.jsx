"use client";

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";

export default function AdminHeader({ gymSeleccionado, setGymSeleccionado, gimnasios, general, alcance }) {
  return (
    <header className="sticky top-0 z-10 mb-6 grid bg-[#242424] pt-2 gap-4 border-b border-[#30332f] pb-5">
      <div>
      <h1 className="text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-[#f2f4ef]">
        {general ? "Administración general" : "Administración de sede"}
      </h1>
      <p className="mt-2 text-sm text-[#d7adff]">Alcance: {alcance}</p>
      </div>

        <label className="grid min-w-0 max-w-sm gap-1.5 text-sm font-semibold text-[#a9afa7]">
          Sede actual
          <select
            className={`min-h-11 w-full rounded-lg border border-[#41433f] bg-[#212320] px-3 text-sm font-bold text-[#f2f4ef] disabled:text-[#a9afa7] ${foco}`}
            value={gymSeleccionado ?? ""}
            disabled={gimnasios.length === 0}
            onChange={(event) => setGymSeleccionado(event.target.value)}
          >
            {gimnasios.length === 0 && <option value="">Sin sedes asignadas</option>}
            {gimnasios.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>

    </header>
  );
}
