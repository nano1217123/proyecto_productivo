"use client";

import Link from "next/link";
import { enlaceReporte } from "@/src/features/reports/ReportActions";

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";

export default function AdminHeader({ gymSeleccionado, setGymSeleccionado, gimnasios, logout, ocultarSelector }) {
  return (
    <header className="mb-6 grid gap-4 border-b border-[#30332f] pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <h1 className="text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-tight text-[#f2f4ef]">
        Administración de sedes
      </h1>

      {!ocultarSelector && (
        <label className="grid min-w-0 max-w-sm gap-1.5 text-sm font-semibold text-[#a9afa7] sm:col-start-1 sm:row-start-2">
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
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-end">
        <Link href="/dashboard/reportes" className={`${enlaceReporte} min-h-11 text-sm font-bold`}>
          Centro de reportes
        </Link>
        <button
          type="button"
          onClick={logout}
          className={`min-h-11 cursor-pointer rounded-sm text-sm font-semibold text-[#a9afa7] hover:text-[#f2f4ef] ${foco}`}
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
