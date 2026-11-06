import { useState } from "react";

export function useMembersFilter(miembros) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const miembrosFiltrados = miembros.filter((m) => {
    const coincideTexto =
      m.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.correo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === "todos" || m.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  const proximosAVencer = miembros.filter((m) => m.estado === "por_vencer");

  return {
    busqueda, setBusqueda,
    filtroEstado, setFiltroEstado,
    miembrosFiltrados, proximosAVencer
  };
}
