"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";

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
  const { logout, profile, session } = useAuth();
  const esSuperAdmin = profile?.tipo_usuario === "super_admin";
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
  const [guardandoSede, setGuardandoSede] = useState(false);

  const [nuevoAdmin, setNuevoAdmin] = useState({ nombres: "", apellidos: "", email: "", password: "" });
const [creandoAdmin, setCreandoAdmin] = useState(false);
const [errorCrearAdmin, setErrorCrearAdmin] = useState("");
const [exitoCrearAdmin, setExitoCrearAdmin] = useState("");

  // Estado para la subida de imágenes cloudinary
  const [imagenFile, setImagenFile] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [urlImagen, setUrlImagen] = useState("");
  const [errorImagen, setErrorImagen] = useState("");
   const [ejercicioId, setEjercicioId] = useState("");
  const [mensajeAsignacion, setMensajeAsignacion] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [urlVideo, setUrlVideo] = useState("");
  const [errorVideo, setErrorVideo] = useState("");
  const [ejercicioVideoId, setEjercicioVideoId] = useState("");
  const [mensajeAsignacionVideo, setMensajeAsignacionVideo] = useState("");
  const [asignandoVideo, setAsignandoVideo] = useState(false);

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
    setGuardandoSede(true);
    setTimeout(() => {
      alert("Datos de la sede actualizados con éxito.");
      setGuardandoSede(false);
    }, 1000);
  };

   const crearAdministrador = async (e) => {
    e.preventDefault();
    setErrorCrearAdmin("");
    setExitoCrearAdmin("");
    setCreandoAdmin(true);

    const nombres = nuevoAdmin.nombres.trim();
    const apellidos = nuevoAdmin.apellidos.trim();
    const email = nuevoAdmin.email.trim();

    if (!nombres || !apellidos) {
      setErrorCrearAdmin("Nombres y apellidos no pueden estar vacíos ni contener solo espacios.");
      setCreandoAdmin(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/auth/create-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 👈 IMPORTANTE: envía las cookies httpOnly al backend
        body: JSON.stringify({
          nombres,
          apellidos,
          email,
          password: nuevoAdmin.password,
          tipoUsuario: "admin", // 👈 Ahora es "admin", no "admin_gimnasio"
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "No se pudo crear el administrador.");
      }

      setExitoCrearAdmin(`Administrador creado. Debe verificar su correo (${email}) con el código que le llegará.`);
      setNuevoAdmin({ nombres: "", apellidos: "", email: "", password: "" });
    } catch (err) {
      setErrorCrearAdmin(err.message);
    } finally {
      setCreandoAdmin(false);
    }
  };
    const subirImagen = async (e) => {
    e.preventDefault();
    if (!imagenFile) return;

    setErrorImagen("");
    setUrlImagen("");
    setSubiendoImagen(true);

    const formData = new FormData();
    formData.append("imagen", imagenFile); // El nombre debe coincidir con upload.single("imagen") del backend

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/imagenes/subir`, {
        method: "POST",
        credentials: "include", // Para enviar la cookie de sesión
        body: formData, // Fetch pone el Content-Type multipart/form-data automáticamente
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al subir la imagen.");
      }

      setUrlImagen(data.url);
      setImagenFile(null); // Limpiar el input
    } catch (err) {
      setErrorImagen(err.message);
    } finally {
      setSubiendoImagen(false);
    }
  };

    const asignarImagenAEjercicio = async (e) => {
    e.preventDefault();
    if (!urlImagen || !ejercicioId) return;

    setMensajeAsignacion("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/ejercicios/${ejercicioId}/imagen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imagenUrl: urlImagen }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al asignar la imagen.");

      setMensajeAsignacion("Imagen asignada al ejercicio correctamente.");
      setEjercicioId("");
    } catch (err) {
      setErrorImagen(err.message);
    }
  };

  const subirVideo = async (e) => {
    e.preventDefault();
    if (!videoFile) return;

    setErrorVideo("");
    setUrlVideo("");
    setSubiendoVideo(true);

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/imagenes/subir-video`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al subir el video.");

      setUrlVideo(data.url);
      setVideoFile(null);
    } catch (err) {
      setErrorVideo(err.message || "Error al subir el video.");
    } finally {
      setSubiendoVideo(false);
    }
  };

  const asignarVideoAEjercicio = async (e) => {
    e.preventDefault();
    if (!urlVideo) {
      setErrorVideo("No hay ninguna URL de video cargada.");
      return;
    }
    if (!ejercicioVideoId) {
      setErrorVideo("Por favor ingresa el ID del ejercicio.");
      return;
    }

    setMensajeAsignacionVideo("");
    setErrorVideo("");
    setAsignandoVideo(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const id = String(ejercicioVideoId).trim();
      const response = await fetch(`${apiUrl}/api/ejercicios/${id}/video`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ videoUrl: urlVideo }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al asignar el video.");

      setMensajeAsignacionVideo("Video asignado al ejercicio correctamente.");
      setEjercicioVideoId("");
    } catch (err) {
      setErrorVideo(err.message || "Error al asignar el video al ejercicio.");
    } finally {
      setAsignandoVideo(false);
    }
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
    <div className="w-full max-w-[1060px] mx-auto px-6 pt-10 pb-20">
      {/* Encabezado */}
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
          {GIMNASIOS.map((g) => (
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

      {/* Navegación por Pestañas */}
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

      {/* PESTAÑA 1: MIEMBROS & SUSCRIPCIONES */}
      {tabActiva === "miembros" && (
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
      )}

      {/* PESTAÑA 2: COMUNICACIÓN (RESEND) */}
      {tabActiva === "comunicacion" && (
        <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
          <h2 className="text-xl mt-0 mb-2">Comunicación con Miembros</h2>
          <p className="text-sm text-[#a9afa7] mb-6">
            Envía anuncios por correo electrónico utilizando la integración con Resend.
          </p>

          <form onSubmit={enviarAnuncio} className="max-w-[600px]">
            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Audiencia destino</label>
              <select value={correoTarget} onChange={(e) => setCorreoTarget(e.target.value)}>
                <option value="por_vencer">Próximos a Vencer (Recordatorio de pago)</option>
                <option value="activo">Solo Miembros Activos</option>
                <option value="todos">Todos los miembros de esta sede</option>
              </select>
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Asunto del correo</label>
              <input
                type="text"
                placeholder="Ej: ¡Tu suscripción vence pronto! / Aviso de feriado"
                value={asuntoCorreo}
                onChange={(e) => setAsuntoCorreo(e.target.value)}
                required
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Mensaje</label>
              <textarea
                rows={5}
                className="w-full p-3 rounded-[10px] bg-[#151714] border border-[#41463f] text-[#f2f4ef] outline-none focus:border-[#b56cff]"
                placeholder="Escribe aquí el cuerpo del correo..."
                value={mensajeCorreo}
                onChange={(e) => setMensajeCorreo(e.target.value)}
                
                required
              />
            </div>

            <button className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={enviandoCorreo}>
              {enviandoCorreo ? "Enviando con Resend..." : "Enviar Anuncio"}
            </button>
          </form>
        </section>
      )}

      {/* PESTAÑA 3: CONFIGURACIÓN DE SEDE */}
      {tabActiva === "configuracion" && (
        <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
          <h2 className="text-xl mt-0 mb-2">Configuración de Sucursal</h2>
          <p className="text-sm text-[#a9afa7] mb-6">
            Actualiza la información pública visible para los clientes de esta sede.
          </p>

          <form onSubmit={guardarConfiguracion} className="max-w-[600px]">
            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Nombre de la Sede</label>
              <input
                type="text"
                value={sedeInfo.nombre}
                onChange={(e) => setSedeInfo({ ...sedeInfo, nombre: e.target.value })}
                required
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Dirección Física</label>
              <input
                type="text"
                value={sedeInfo.direccion}
                onChange={(e) => setSedeInfo({ ...sedeInfo, direccion: e.target.value })}
                required
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Teléfono de contacto</label>
              <input
                type="text"
                value={sedeInfo.telefono}
                onChange={(e) => setSedeInfo({ ...sedeInfo, telefono: e.target.value })}
                required
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)] [&_select]:w-full [&_select]:p-[12px_13px] [&_select]:border [&_select]:border-[#41463f] [&_select]:rounded-[10px] [&_select]:outline-0 [&_select]:bg-[#151714] [&_select]:text-[#f2f4ef] [&_select]:text-sm [&_select]:focus:border-[#b56cff] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Horarios de Atención</label>
              <input
                type="text"
                value={sedeInfo.horario}
                onChange={(e) => setSedeInfo({ ...sedeInfo, horario: e.target.value })}
                required
              />
            </div>
            <button className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={guardandoSede}>
              {guardandoSede ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </section>
      )}

             {tabActiva === "crear-admin" && esSuperAdmin && (
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
              <input
                type="text"
                value={nuevoAdmin.nombres}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, nombres: e.target.value })}
                maxLength={60}
                required
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Apellidos</label>
              <input
                type="text"
                value={nuevoAdmin.apellidos}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, apellidos: e.target.value })}
                maxLength={60}
                required
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Correo</label>
              <input
                type="email"
                value={nuevoAdmin.email}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, email: e.target.value })}
                required
              />
            </div>

            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd] [&_input]:w-full [&_input]:p-[12px_13px] [&_input]:border [&_input]:border-[#41463f] [&_input]:rounded-[10px] [&_input]:outline-0 [&_input]:bg-[#151714] [&_input]:text-[#f2f4ef] [&_input]:text-sm [&_input]:focus:border-[#b56cff] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(181,108,255,.18)]">
              <label>Contraseña temporal</label>
              <input
                type="password"
                value={nuevoAdmin.password}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, password: e.target.value })}
                minLength={8}
                maxLength={30}
                required
              />
            </div>

            <button
              className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={creandoAdmin}
            >
              {creandoAdmin ? "Creando..." : "Crear Administrador"}
            </button>
          </form>
        </section>
      )}

            {/* PESTAÑA: SUBIR IMÁGENES Y VIDEOS */}
      {tabActiva === "imagenes" && (
        <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
          
          {/* --- SECCIÓN DE IMÁGENES --- */}
          <h2 className="text-xl mt-0 mb-2">Subir Imagen a Cloudinary</h2>
          <p className="text-sm text-[#a9afa7] mb-6">
            Sube imágenes para los ejercicios. Las imágenes se almacenan en la nube.
          </p>

          {errorImagen && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{errorImagen}</div>}
          
          {urlImagen && (
            <div className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px] break-all">
              <strong>¡Imagen subida!</strong> <br />
              URL: <a href={urlImagen} target="_blank" rel="noreferrer" className="underline">{urlImagen}</a>
            </div>
          )}

          <form onSubmit={subirImagen} className="max-w-[600px] mb-8">
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
              className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer transition hover:bg-[#d7adff] disabled:opacity-60"
              type="submit"
              disabled={subiendoImagen || !imagenFile}
            >
              {subiendoImagen ? "Subiendo a Cloudinary..." : "Subir Imagen"}
            </button>
          </form>

          {urlImagen && (
            <form onSubmit={asignarImagenAEjercicio} className="p-4 border border-[#41433f] rounded-lg bg-[#151714] max-w-[600px]">
              <h3 className="text-[#b56cff] font-bold mb-3">Asignar esta imagen a un ejercicio</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-[#a9afa7]">
                  <label>ID del Ejercicio</label>
                  <input
                    type="number"
                    value={ejercicioId}
                    onChange={(e) => setEjercicioId(e.target.value)}
                    placeholder="Ej: 1"
                    className="w-full p-2 bg-[#212320] border border-[#41463f] rounded text-[#f2f4ef]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b56cff] text-[#10110f] font-bold rounded hover:bg-[#d7adff]"
                >
                  Asignar Imagen
                </button>
              </div>
              {mensajeAsignacion && <p className="text-[#d7adff] text-xs mt-2">{mensajeAsignacion}</p>}
            </form>
          )}

          {/* --- SECCIÓN DE VIDEOS --- */}
          <hr className="my-8 border-[#41433f]" />
          <h2 className="text-xl mt-0 mb-2">Subir Video a Cloudinary</h2>
          <p className="text-sm text-[#a9afa7] mb-6">Sube videos para los ejercicios. Los videos se almacenan en la nube.</p>

          {errorVideo && <div className="mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{errorVideo}</div>}

          {urlVideo && (
            <div className="mb-4 p-[10px_12px] border border-[rgba(181,108,255,0.32)] rounded-lg bg-[#321d47] text-[#d7adff] text-[13px] break-all">
              <strong>¡Video subido!</strong> <br />
              URL: <a href={urlVideo} target="_blank" rel="noreferrer" className="underline">{urlVideo}</a>
            </div>
          )}

          <form onSubmit={subirVideo} className="max-w-[600px] mb-8">
            <div className="mb-4 [&_label]:block [&_label]:mb-2 [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#c0c7bd]">
              <label>Selecciona un video (máx. 50MB)</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files[0])}
                className="w-full p-2 bg-[#151714] border border-[#41463f] rounded-[10px] text-[#f2f4ef] text-sm"
                required
              />
            </div>

            <button
              className="w-full mt-1.5 p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer transition hover:bg-[#d7adff] disabled:opacity-60"
              type="submit"
              disabled={subiendoVideo || !videoFile}
            >
              {subiendoVideo ? "Subiendo a Cloudinary..." : "Subir Video"}
            </button>
          </form>

          {urlVideo && (
            <form onSubmit={asignarVideoAEjercicio} className="p-4 border border-[#41433f] rounded-lg bg-[#151714] max-w-[600px]">
              <h3 className="text-[#b56cff] font-bold mb-3">Asignar este video a un ejercicio</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1 [&_label]:block [&_label]:mb-1 [&_label]:text-xs [&_label]:text-[#a9afa7]">
                  <label>ID del Ejercicio</label>
                  <input
                    type="number"
                    value={ejercicioVideoId}
                    onChange={(e) => setEjercicioVideoId(e.target.value)}
                    placeholder="Ej: 1"
                    className="w-full p-2 bg-[#212320] border border-[#41463f] rounded text-[#f2f4ef]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={asignandoVideo}
                  className="px-4 py-2 bg-[#b56cff] text-[#10110f] font-bold rounded hover:bg-[#d7adff] disabled:opacity-60 transition"
                >
                  {asignandoVideo ? "Asignando..." : "Asignar Video"}
                </button>
              </div>
              {mensajeAsignacionVideo && <p className="text-[#d7adff] text-xs mt-2 font-semibold">{mensajeAsignacionVideo}</p>}
              {errorVideo && <p className="text-[#ff7979] text-xs mt-2 font-semibold">{errorVideo}</p>}
            </form>
          )}
        </section>
      )}
    </div>
  );
}
