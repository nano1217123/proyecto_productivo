"use client";

export default function CreateAdminTab({
  errorCrearAdmin, exitoCrearAdmin,
  nuevoAdmin, setNuevoAdmin,
  crearAdministrador, creandoAdmin
}) {
  return (
    <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
      <h2 className="text-xl mt-0 mb-2">Crear Administrador de Gimnasio</h2>
      <p className="text-sm text-[#a9afa7] mb-6">
        Solo tú puedes crear cuentas de administrador. La persona recibirá un correo para verificar su cuenta.
      </p>

      {errorCrearAdmin && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{errorCrearAdmin}</div>}
      {exitoCrearAdmin && <div className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px]">{exitoCrearAdmin}</div>}

      <form onSubmit={crearAdministrador} className="max-w-[600px]">
        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
          <label>Nombres</label>
          <input type="text" value={nuevoAdmin.nombres} onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, nombres: e.target.value })} maxLength={60} required />
        </div>
        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
          <label>Apellidos</label>
          <input type="text" value={nuevoAdmin.apellidos} onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, apellidos: e.target.value })} maxLength={60} required />
        </div>
        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
          <label>Correo</label>
          <input type="email" value={nuevoAdmin.email} onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, email: e.target.value })} required />
        </div>
        <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
          <label>Contraseña temporal</label>
          <input type="password" value={nuevoAdmin.password} onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, password: e.target.value })} minLength={8} maxLength={30} required />
        </div>
        <button className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={creandoAdmin}>
          {creandoAdmin ? "Creando..." : "Crear Administrador"}
        </button>
      </form>
    </section>
  );
}
