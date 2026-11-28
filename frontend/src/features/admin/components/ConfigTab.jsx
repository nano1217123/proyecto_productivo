"use client";

// Datos de la sede seleccionada según GET /api/sedes (slug, nombre y
// ubicación), solo lectura. Todavía no hay un endpoint para editarlos ni
// para guardar teléfono u horarios.
export default function ConfigTab({ gymSlug, sede, errorSedes }) {
  return (
    <section
      aria-labelledby="perfil-sede-titulo"
      className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]"
    >
      <h2 id="perfil-sede-titulo" className="text-xl mt-0 mb-2">
        Información de la sede
      </h2>
      <p className="text-sm text-[#a9afa7] mb-5 max-w-[600px]">
        Información pública de la sede seleccionada, tal como la tiene registrada la plataforma.
      </p>

      {!gymSlug ? (
        <p className="text-sm text-[#a9afa7] mb-5">No tienes sedes asignadas.</p>
      ) : errorSedes && !sede ? (
        <p role="alert" className="mb-5 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">
          {errorSedes}
        </p>
      ) : !sede ? (
        <p className="text-sm text-[#a9afa7] mb-5" aria-live="polite">Cargando datos de la sede...</p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 max-w-[600px] m-0 mb-5">
          <div className="p-3.5 rounded-[10px] border border-[#41433f] bg-[#151714]">
            <dt className="text-xs font-bold text-[#a9afa7] mb-1">Nombre</dt>
            <dd className="m-0 font-bold text-[#f2f4ef]">{sede.nombre}</dd>
          </div>
          <div className="p-3.5 rounded-[10px] border border-[#41433f] bg-[#151714]">
            <dt className="text-xs font-bold text-[#a9afa7] mb-1">Ubicación</dt>
            <dd className="m-0 font-bold text-[#f2f4ef]">{sede.ubicacion}</dd>
          </div>
        </dl>
      )}

    </section>
  );
}
