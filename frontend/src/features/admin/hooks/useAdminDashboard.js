import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { adminApi } from "../api/adminApi";
import { MIEMBROS_MOCK } from "../lib/mockData";

const CLAVE_PESTANA = "jjgym:admin:pestana";
const PESTANAS = ["miembros", "clientes", "imagenes", "comunicacion", "configuracion"];

// "crear-admin" solo para super_admin y "suscripcion" solo para admin de
// sede (super_admin y cliente no pagan); el backend vuelve a comprobarlo.
function pestanaPermitida(tab, { esSuperAdmin, esAdmin }) {
  return (
    PESTANAS.includes(tab) ||
    (tab === "crear-admin" && esSuperAdmin) ||
    (tab === "suscripcion" && esAdmin)
  );
}

export function useAdminDashboard() {
  const { logout, profile } = useAuth();
  const esSuperAdmin = profile?.tipo_usuario === "super_admin";
  const esAdmin = profile?.tipo_usuario === "admin";
  
  // Navegación. La pestaña activa se conserva si el panel se vuelve a montar
  // o se recarga la página, siempre que el rol actual pueda verla.
  const [tabActiva, setTabActivaEstado] = useState("miembros");
  const setTabActiva = useCallback((tab) => {
    setTabActivaEstado(tab);
    try { sessionStorage.setItem(CLAVE_PESTANA, tab); } catch { /* sin almacenamiento */ }
  }, []);
  useEffect(() => {
    let guardada = null;
    try { guardada = sessionStorage.getItem(CLAVE_PESTANA); } catch { /* sin almacenamiento */ }
    if (guardada && pestanaPermitida(guardada, { esSuperAdmin, esAdmin })) setTabActivaEstado(guardada);
    else if (guardada) setTabActivaEstado("miembros");
  }, [esSuperAdmin, esAdmin]);
  // Sede elegida en el panel. Las opciones salen del servidor: las sedes
  // del admin (admin_sedes) o el catálogo completo para el super_admin.
  const [gymSeleccionado, setGymSeleccionado] = useState(null);
  
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
    imagenFile, setImagenFile, subiendoImagen, urlImagen, errorImagen, ejercicioId, setEjercicioId, mensajeAsignacion, subirImagen, asignarImagenAEjercicio
  };
}
