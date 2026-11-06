"use client";

export default function MembersTab({
  miembros,
  miembrosFiltrados,
  proximosAVencer,
  busqueda,
  setBusqueda,
  filtroEstado,
  setFiltroEstado,
  renovarSuscripcion,
  cambiarEstadoMiembro,
  errorImagen,
  urlImagen,
  subirImagen,
  setImagenFile,
  subiendoImagen,
  imagenFile,
  asignarImagenAEjercicio,
  ejercicioId,
  setEjercicioId,
  mensajeAsignacion,
}) {
  return (
    <>
      {/* Tarjetas de Métricas */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px] mb-8">
        <div className="p-5 bg-[#212320] border border-[#41433f] rounded-xl [&>span]:block [&>span]:mb-1.5 [&>span]:text-xs [&>span]:font-bold [&>span]:text-[#a9afa7] [&>strong]:text-[32px] [&>strong]:leading-none">
          <span>Total Registrados</span>
          <strong>{miembros.length}</strong>
        </div>
        <div className="p-5 bg-[#212320] border border-[#41433f] rounded-xl [&>span]:block [&>span]:mb-1.5 [&>span]:text-xs [&>span]:font-bold [&>span]:text-[#a9afa7] [&>strong]:text-[32px] [&>strong]:leading-none [&>strong]:text-[#d7adff]">
          <span>Activos</span>
          <strong>{miembros.filter((m) => m.estado === "activo").length}</strong>
        </div>
        <div className="p-5 bg-[#212320] border border-[#41433f] rounded-xl [&>span]:block [&>span]:mb-1.5 [&>span]:text-xs [&>span]:font-bold [&>span]:text-[#a9afa7] [&>strong]:text-[32px] [&>strong]:leading-none [&>strong]:text-[#ffc177]">
          <span>Por Vencer (7 días)</span>
          <strong>{proximosAVencer.length}</strong>
        </div>
        <div className="p-5 bg-[#212320] border border-[#41433f] rounded-xl [&>span]:block [&>span]:mb-1.5 [&>span]:text-xs [&>span]:font-bold [&>span]:text-[#a9afa7] [&>strong]:text-[32px] [&>strong]:leading-none [&>strong]:text-[#ff7979]">
          <span>Vencidos / Inactivos</span>
          <strong>{miembros.filter((m) => m.estado === "vencido" || m.estado === "suspendido").length}</strong>
        </div>
      </section>

      {/* PESTAÑA 4: SUBIR IMÁGENES (Bug preexistente: este bloque estaba anidado dentro de miembros) */}
      <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
        <h2 className="text-xl mt-0 mb-2">Subir Imagen a Cloudinary</h2>
        <p className="text-sm text-[#a9afa7] mb-6">
          Sube imágenes para los ejercicios o el gimnasio. Las imágenes se almacenan en la nube.
        </p>

        {errorImagen && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{errorImagen}</div>}
        
        {urlImagen && (
          <div className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px] break-all">
            <strong>¡Imagen subida!</strong> <br />
            URL: <a href={urlImagen} target="_blank" rel="noreferrer" className="underline">{urlImagen}</a>
          </div>
        )}

        <form onSubmit={subirImagen} className="max-w-[600px]">
          <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd]">
            <label>Selecciona una imagen (máx. 5MB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImagenFile(e.target.files[0])}
              className="w-full p-2 bg-[#151714] border border-[#41463f] rounded-[10px] text-[#f2f4ef] text-sm"
              required
            />
          </div>

          <button
            className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[##10110f] text-sm font-extrabold cursor-pointer transition hover:bg-[#d7adff] disabled:opacity-60"
            type="submit"
            disabled={subiendoImagen || !imagenFile}
          >
            {subiendoImagen ? "Subiendo a Cloudinary..." : "Subir Imagen"}
          </button>
        </form>
      </section>

      {/* Tabla de Control de Miembros */}
      <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <input
            type="text"
            className="flex-1 min-w-[240px] p-[10px_14px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-[13.5px] outline-none focus:border-[#b56cff]"
            placeholder="Buscar cliente por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <div className="flex items-center gap-2.5 [&_select]:p-[10px_12px] [&_select]:bg-[#151714] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-lg [&_select]:text-[#f2f4ef] [&_select]:text-[13.5px]">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="por_vencer">Por vencer</option>
              <option value="vencido">Vencidos</option>
              <option value="suspendido">Suspendidos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left [&_th]:p-[12px_16px] [&_th]:border-b [&_th]:border-[#383c35] [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:text-[#a9afa7] [&_td]:p-4 [&_td]:border-b [&_td]:border-[#2d302a] [&_td]:text-[13.5px]">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plan</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Acciones de Administración</th>
              </tr>
            </thead>
            <tbody>
              {miembrosFiltrados.length > 0 ? (
                miembrosFiltrados.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="[&_strong]:block [&_strong]:text-[#f2f4ef] [&_small]:text-xs [&_small]:text-[#a9afa7]">
                        <strong>{m.nombres}</strong>
                        <small>{m.correo}</small>
                      </div>
                    </td>
                    <td>{m.plan}</td>
                    <td>{m.vencimiento}</td>
                    <td>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11.5px] font-bold ${m.estado === "activo" ? "bg-[rgba(181,108,255,.15)] text-[#d7adff] border border-[rgba(181,108,255,.3)]" : m.estado === "por_vencer" ? "bg-[rgba(255,193,119,.15)] text-[#ffc177] border border-[rgba(255,193,119,.3)]" : "bg-[rgba(255,121,121,.15)] text-[#ff7979] border border-[rgba(255,121,121,.3)]"}`}>
                        {m.estado === "activo" && "Activo"}
                        {m.estado === "por_vencer" && "Por Vencer"}
                        {m.estado === "vencido" && "Vencido"}
                        {m.estado === "suspendido" && "Suspendido"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1.5 bg-transparent border border-[#41463f] rounded-md text-[#f2f4ef] text-xs font-semibold cursor-pointer transition hover:border-[#b56cff] hover:text-[#d7adff] hover:bg-[#321d47]"
                          onClick={() => renovarSuscripcion(m.id)}
                          title="Pagar en efectivo o posnet y sumar 30 días"
                        >
                          Renovar (+30d)
                        </button>
                        {m.estado !== "suspendido" ? (
                          <button
                            className="px-3 py-1.5 bg-transparent border border-[rgba(255,121,121,.4)] rounded-md text-[#ff7979] text-xs font-semibold cursor-pointer transition hover:bg-[#351b1b]"
                            onClick={() => cambiarEstadoMiembro(m.id, "suspendido")}
                          >
                            Suspender
                          </button>
                        ) : (
                          <button
                            className="px-3 py-1.5 bg-transparent border border-[rgba(181,108,255,.4)] rounded-md text-[#d7adff] text-xs font-semibold cursor-pointer transition hover:bg-[#321d47]"
                            onClick={() => cambiarEstadoMiembro(m.id, "activo")}
                          >
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-[#a9afa7]">
                    No hay clientes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
