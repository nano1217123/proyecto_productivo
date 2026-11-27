export const PESTANA_INICIAL = "clientes";

export function pestanasAdmin({ esAdmin, esSuperAdmin }) {
  return [
    { id: "clientes", etiqueta: "👥 Clientes de la sede" },
    { id: "imagenes", etiqueta: "📸 Subir imágenes" },
    { id: "comunicacion", etiqueta: "📢 Anuncios (correo)", pronto: true },
    { id: "configuracion", etiqueta: "⚙️ Perfil de sede" },
    (esAdmin || esSuperAdmin) && { id: "reportes-resenas", etiqueta: "Reportes de reseñas" },
    esAdmin && { id: "suscripcion", etiqueta: "💳 Suscripción" },
    esSuperAdmin && { id: "crear-admin", etiqueta: "🛡️ Asignar administrador" },
  ].filter(Boolean);
}

export function restaurarPestana(tab, roles) {
  return pestanasAdmin(roles).some(({ id }) => id === tab) ? tab : PESTANA_INICIAL;
}
