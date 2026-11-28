export const PESTANA_INICIAL = "clientes";

export function pestanasAdmin({ esAdmin, esSuperAdmin }) {
  return [
    { id: "clientes", etiqueta: "Clientes" },
    { id: "imagenes", etiqueta: "Imágenes de ejercicios" },
    { id: "configuracion", etiqueta: "Información de sede" },
    esAdmin && { id: "suscripcion", etiqueta: "Suscripción" },
    esSuperAdmin && { id: "crear-admin", etiqueta: "Asignar administrador" },
  ].filter(Boolean);
}

export function restaurarPestana(tab, roles) {
  return pestanasAdmin(roles).some(({ id }) => id === tab) ? tab : PESTANA_INICIAL;
}
