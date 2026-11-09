import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { adminApi } from "../api/adminApi";
import { MIEMBROS_MOCK } from "../lib/mockData";

export function useAdminDashboard() {
  const { logout, profile } = useAuth();
  const esSuperAdmin = profile?.tipo_usuario === "super_admin";
  
  // Navegación
  const [tabActiva, setTabActiva] = useState("miembros");
  const [gymSeleccionado, setGymSeleccionado] = useState("jj-poblado");
  
  // Miembros
  const [miembros, setMiembros] = useState(MIEMBROS_MOCK);
  
  // Comunicación
  const [correoTarget, setCorreoTarget] = useState("por_vencer");
  const [asuntoCorreo, setAsuntoCorreo] = useState("");
  const [mensajeCorreo, setMensajeCorreo] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // Configuración Sede
  const [sedeInfo, setSedeInfo] = useState({
    nombre: "JJ GYM El Poblado",
    direccion: "Calle 10 # 43A-25, Medellín",
    telefono: "+57 300 123 4567",
    horario: "Lunes a Viernes: 5:00 AM - 10:00 PM | Sábados: 7:00 AM - 6:00 PM",
  });
  const [guardandoSede, setGuardandoSede] = useState(false);

  // Crear Admin
  const [nuevoAdmin, setNuevoAdmin] = useState({ nombres: "", apellidos: "", email: "", password: "" });
  const [creandoAdmin, setCreandoAdmin] = useState(false);
  const [errorCrearAdmin, setErrorCrearAdmin] = useState("");
  const [exitoCrearAdmin, setExitoCrearAdmin] = useState("");

  // Imágenes
  const [imagenFile, setImagenFile] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [urlImagen, setUrlImagen] = useState("");
  const [errorImagen, setErrorImagen] = useState("");
  const [ejercicioId, setEjercicioId] = useState("");
  const [mensajeAsignacion, setMensajeAsignacion] = useState("");

  // Handlers Miembros
  const renovarSuscripcion = (id) => {
    setMiembros((prev) => prev.map((m) => m.id === id ? { ...m, estado: "activo", vencimiento: "2026-09-21" } : m));
  };

  const cambiarEstadoMiembro = (id, nuevoEstado) => {
    setMiembros((prev) => prev.map((m) => m.id === id ? { ...m, estado: nuevoEstado } : m));
  };

  // Handlers Formularios
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
      await adminApi.createAdmin({ nombres, apellidos, email, password: nuevoAdmin.password });
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
      setImagenFile(null);
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

  return {
    logout, esSuperAdmin,
    tabActiva, setTabActiva,
    gymSeleccionado, setGymSeleccionado,
    miembros, setMiembros,
    correoTarget, setCorreoTarget, asuntoCorreo, setAsuntoCorreo, mensajeCorreo, setMensajeCorreo, enviandoCorreo, enviarAnuncio,
    sedeInfo, setSedeInfo, guardandoSede, guardarConfiguracion,
    nuevoAdmin, setNuevoAdmin, creandoAdmin, errorCrearAdmin, exitoCrearAdmin, crearAdministrador,
    imagenFile, setImagenFile, subiendoImagen, urlImagen, errorImagen, ejercicioId, setEjercicioId, mensajeAsignacion, subirImagen, asignarImagenAEjercicio
  };
}
