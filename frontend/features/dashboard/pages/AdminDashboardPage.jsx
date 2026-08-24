"use client";

import { useState } from "react";

const GIMNASIOS = [
  { id: "jj-poblado", nombre: "JJ GYM El Poblado" },
  { id: "power-laureles", nombre: "Power Laureles" },
  { id: "fit-belen", nombre: "Fit Lab Belén" },
];

const MIEMBROS_MOCK = [
  { id: "1", nombres: "Carlos Andrés", correo: "carlos@gmail.com", plan: "Mensual", estado: "activo", vencimiento: "2026-09-15", registro: "2026-01-10" },
  { id: "2", nombres: "Mariana Gómez", correo: "mariana@hotmail.com", plan: "Trimestral", estado: "por_vencer", vencimiento: "2026-08-25", registro: "2026-02-14" },
  { id: "3", nombres: "Mateo Rossi", correo: "mateo@gmail.com", plan: "Mensual", estado: "vencido", vencimiento: "2026-08-10", registro: "2025-11-20" },
  { id: "4", nombres: "Sofia López", correo: "sofia@outlook.com", plan: "Anual", estado: "suspendido", vencimiento: "2026-07-01", registro: "2025-08-05" },
];

export default function AdminDashboardPage() {
  const [tabActiva, setTabActiva] = useState("miembros"); // 'miembros' | 'comunicacion' | 'configuracion'
  const [gymSeleccionado, setGymSeleccionado] = useState("jj-poblado");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [miembros, setMiembros] = useState(MIEMBROS_MOCK);

  // Formulario de Comunicación
  const [correoTarget, setCorreoTarget] = useState("por_vencer");
  const [asuntoCorreo, setAsuntoCorreo] = useState("");
  const [mensajeCorreo, setMensajeCorreo] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // Formulario de Configuración de Sede
  const [sedeInfo, setSedeInfo] = useState({
    nombre: "JJ GYM El Poblado",
    direccion: "Calle 10 # 43A-25, Medellín",
    telefono: "+57 300 123 4567",
    horario: "Lunes a Viernes: 5:00 AM - 10:00 PM | Sábados: 7:00 AM - 6:00 PM",
  });

  // Acciones sobre Miembros
  const renovarSuscripcion = (id) => {
    setMiembros((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, estado: "activo", vencimiento: "2026-09-21" } : m
      )
    );
  };

  const cambiarEstadoMiembro = (id, nuevoEstado) => {
    setMiembros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, estado: nuevoEstado } : m))
    );
  };

  const enviarAnuncio = (e) => {
    e.preventDefault();
    setEnviandoCorreo(true);
    setTimeout(() => {
      alert(`Correo enviado a los miembros con filtro: "${correoTarget}"`);
      setEnviandoCorreo(false);
      setAsuntoCorreo("");
      setMensajeCorreo("");
    }, 1000);
  };

  const guardarConfiguracion = (e) => {
    e.preventDefault();
    alert("Datos de la sede actualizados con éxito.");
  };

  // Filtrado de la lista de miembros
  const miembrosFiltrados = miembros.filter((m) => {
    const coincideTexto =
      m.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.correo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === "todos" || m.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  const proximosAVencer = miembros.filter((m) => m.estado === "por_vencer");

  return (
    <div className="admin-layout">
      {/* Encabezado */}
      <header className="admin-header">
        <div>
          <span className="gym-kicker">PANEL DE ADMINISTRACIÓN</span>
          <h1 className="admin-title">Gestión de Sede</h1>
        </div>

        <div className="gym-selector-box">
          <label htmlFor="select-gym">Sede actual:</label>
          <select
            id="select-gym"
            value={gymSeleccionado}
            onChange={(e) => setGymSeleccionado(e.target.value)}
          >
            {GIMNASIOS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Navegación por Pestañas */}
      <nav className="admin-tabs-bar" style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
        <button
          className={`btn-tab ${tabActiva === "miembros" ? "is-active" : ""}`}
          onClick={() => setTabActiva("miembros")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid " + (tabActiva === "miembros" ? "var(--green)" : "#41463f"),
            background: tabActiva === "miembros" ? "var(--green-soft)" : "#151714",
            color: tabActiva === "miembros" ? "var(--lime)" : "var(--muted)",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          👥 Miembros & Suscripciones
        </button>

        <button
          className={`btn-tab ${tabActiva === "comunicacion" ? "is-active" : ""}`}
          onClick={() => setTabActiva("comunicacion")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid " + (tabActiva === "comunicacion" ? "var(--green)" : "#41463f"),
            background: tabActiva === "comunicacion" ? "var(--green-soft)" : "#151714",
            color: tabActiva === "comunicacion" ? "var(--lime)" : "var(--muted)",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          📢 Anuncios (Correo)
        </button>

        <button
          className={`btn-tab ${tabActiva === "configuracion" ? "is-active" : ""}`}
          onClick={() => setTabActiva("configuracion")}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid " + (tabActiva === "configuracion" ? "var(--green)" : "#41463f"),
            background: tabActiva === "configuracion" ? "var(--green-soft)" : "#151714",
            color: tabActiva === "configuracion" ? "var(--lime)" : "var(--muted)",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          ⚙️ Perfil de Sede
        </button>
      </nav>

      {/* PESTAÑA 1: MIEMBROS & SUSCRIPCIONES */}
      {tabActiva === "miembros" && (
        <>
          {/* Tarjetas de Métricas */}
          <section className="admin-stats-grid">
            <div className="stat-card">
              <span>Total Registrados</span>
              <strong>{miembros.length}</strong>
            </div>
            <div className="stat-card stat-active">
              <span>Activos</span>
              <strong>{miembros.filter((m) => m.estado === "activo").length}</strong>
            </div>
            <div className="stat-card stat-warning">
              <span>Por Vencer (7 días)</span>
              <strong>{proximosAVencer.length}</strong>
            </div>
            <div className="stat-card stat-expired">
              <span>Vencidos / Inactivos</span>
              <strong>{miembros.filter((m) => m.estado === "vencido" || m.estado === "suspendido").length}</strong>
            </div>
          </section>

          {/* Tabla de Control de Miembros */}
          <section className="admin-table-container">
            <div className="table-actions-bar">
              <input
                type="text"
                className="table-search-input"
                placeholder="Buscar cliente por nombre o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />

              <div className="table-filters">
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

            <div className="table-responsive">
              <table className="admin-table">
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
                          <div className="user-cell">
                            <strong>{m.nombres}</strong>
                            <small>{m.correo}</small>
                          </div>
                        </td>
                        <td>{m.plan}</td>
                        <td>{m.vencimiento}</td>
                        <td>
                          <span className={`status-badge status-${m.estado}`}>
                            {m.estado === "activo" && "Activo"}
                            {m.estado === "por_vencer" && "Por Vencer"}
                            {m.estado === "vencido" && "Vencido"}
                            {m.estado === "suspendido" && "Suspendido"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="btn-action-renew"
                              onClick={() => renovarSuscripcion(m.id)}
                              title="Pagar en efectivo o posnet y sumar 30 días"
                            >
                              Renovar (+30d)
                            </button>
                            {m.estado !== "suspendido" ? (
                              <button
                                className="btn-action-renew"
                                style={{ borderColor: "rgba(255,121,121,0.4)", color: "var(--danger)" }}
                                onClick={() => cambiarEstadoMiembro(m.id, "suspendido")}
                              >
                                Suspender
                              </button>
                            ) : (
                              <button
                                className="btn-action-renew"
                                style={{ borderColor: "rgba(181,108,255,0.4)", color: "var(--lime)" }}
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
                      <td colSpan="5" className="table-empty">
                        No hay clientes que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* PESTAÑA 2: COMUNICACIÓN (RESEND) */}
      {tabActiva === "comunicacion" && (
        <section className="admin-table-container">
          <h2 style={{ fontSize: "20px", marginTop: 0, marginBottom: "8px" }}>Comunicación con Miembros</h2>
          <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "24px" }}>
            Envía anuncios por correo electrónico utilizando la integración con Resend.
          </p>

          <form onSubmit={enviarAnuncio} style={{ maxWidth: "600px" }}>
            <div className="field">
              <label>Audiencia destino</label>
              <select value={correoTarget} onChange={(e) => setCorreoTarget(e.target.value)}>
                <option value="por_vencer">Próximos a Vencer (Recordatorio de pago)</option>
                <option value="activo">Solo Miembros Activos</option>
                <option value="todos">Todos los miembros de esta sede</option>
              </select>
            </div>

            <div className="field">
              <label>Asunto del correo</label>
              <input
                type="text"
                placeholder="Ej: ¡Tu suscripción vence pronto! / Aviso de feriado"
                value={asuntoCorreo}
                onChange={(e) => setAsuntoCorreo(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Mensaje</label>
              <textarea
                rows={5}
                className="field-textarea"
                placeholder="Escribe aquí el cuerpo del correo..."
                value={mensajeCorreo}
                onChange={(e) => setMensajeCorreo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#151714",
                  border: "1px solid #41463f",
                  color: "var(--ink)",
                  fontFamily: "inherit",
                }}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={enviandoCorreo} style={{ width: "auto", padding: "12px 24px" }}>
              {enviandoCorreo ? "Enviando con Resend..." : "Enviar Anuncio"}
            </button>
          </form>
        </section>
      )}

      {/* PESTAÑA 3: CONFIGURACIÓN DE SEDE */}
      {tabActiva === "configuracion" && (
        <section className="admin-table-container">
          <h2 style={{ fontSize: "20px", marginTop: 0, marginBottom: "8px" }}>Configuración de Sucursal</h2>
          <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "24px" }}>
            Actualiza la información pública visible para los clientes de esta sede.
          </p>

          <form onSubmit={guardarConfiguracion} style={{ maxWidth: "600px" }}>
            <div className="field">
              <label>Nombre de la Sede</label>
              <input
                type="text"
                value={sedeInfo.nombre}
                onChange={(e) => setSedeInfo({ ...sedeInfo, nombre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label>Dirección Física</label>
              <input
                type="text"
                value={sedeInfo.direccion}
                onChange={(e) => setSedeInfo({ ...sedeInfo, direccion: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label>Teléfono de contacto</label>
              <input
                type="text"
                value={sedeInfo.telefono}
                onChange={(e) => setSedeInfo({ ...sedeInfo, telefono: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label>Horarios de Atención</label>
              <input
                type="text"
                value={sedeInfo.horario}
                onChange={(e) => setSedeInfo({ ...sedeInfo, horario: e.target.value })}
                required
              />
            </div>

            <button className="btn-primary" type="submit" style={{ width: "auto", padding: "12px 24px" }}>
              Guardar Cambios
            </button>
          </form>
        </section>
      )}
    </div>
  );
}