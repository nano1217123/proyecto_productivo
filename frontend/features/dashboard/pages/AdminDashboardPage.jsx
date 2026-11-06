"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { adminApi } from "../api/adminApi";
import { useMembersFilter } from "../hooks/useMembersFilter";
import AdminHeader from "../components/AdminHeader";
import AdminTabs from "../components/AdminTabs";
import MembersTab from "../components/MembersTab";

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
  const [miembros, setMiembros] = useState(MIEMBROS_MOCK);
  const { busqueda, setBusqueda, filtroEstado, setFiltroEstado, miembrosFiltrados, proximosAVencer } = useMembersFilter(miembros);
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
          await adminApi.createAdmin({
        nombres,
        apellidos,
        email,
        password: nuevoAdmin.password,
      }); 

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

        try {
      const data = await adminApi.uploadImage(imagenFile);
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
      await adminApi.assignImageToExercise(ejercicioId, urlImagen);
      setMensajeAsignacion("Imagen asignada al ejercicio correctamente.");
      setEjercicioId("");
    } catch (err) {
      setErrorImagen(err.message);
    }
  };


  // Filtrado de la lista de miembros


  return (
    <div className="w-full max-w-[1060px] mx-auto px-6 pt-10 pb-20">
      {/* Encabezado */}
      <AdminHeader 
        gymSeleccionado={gymSeleccionado} 
        setGymSeleccionado={setGymSeleccionado} 
        gimnasios={GIMNASIOS} 
        logout={logout} 
      />

      {/* Navegación por Pestañas */}
      <AdminTabs 
        tabActiva={tabActiva} 
        setTabActiva={setTabActiva} 
        esSuperAdmin={esSuperAdmin} 
      />

      {/* PESTAÑA 1: MIEMBROS & SUSCRIPCIONES */}
      {tabActiva === "miembros" && (
        <MembersTab
          miembros={miembros}
          miembrosFiltrados={miembrosFiltrados}
          proximosAVencer={proximosAVencer}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          filtroEstado={filtroEstado}
          setFiltroEstado={setFiltroEstado}
          renovarSuscripcion={renovarSuscripcion}
          cambiarEstadoMiembro={cambiarEstadoMiembro}
          errorImagen={errorImagen}
          urlImagen={urlImagen}
          subirImagen={subirImagen}
          setImagenFile={setImagenFile}
          subiendoImagen={subiendoImagen}
          imagenFile={imagenFile}
          asignarImagenAEjercicio={asignarImagenAEjercicio}
          ejercicioId={ejercicioId}
          setEjercicioId={setEjercicioId}
          mensajeAsignacion={mensajeAsignacion}
        />
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

      {/* PESTAÑA: SUBIR IMÁGENES */}
      {tabActiva === "imagenes" && (
        <section className="p-6 bg-[#212320] border border-[#41433f] rounded-[14px]">
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
        </section>
      )}
    </div>
  );
}