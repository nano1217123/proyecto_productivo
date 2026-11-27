export function accesoReportes(perfil, catalogo = []) {
  const rol = perfil?.tipo_usuario;
  const consolidado = rol === "super_admin";
  const resenas = consolidado || rol === "admin";
  return {
    personales: resenas || rol === "cliente" || rol === "usuario_particular",
    resenas,
    consolidado,
    sedes: consolidado ? catalogo.map(sede => sede.slug)
      : resenas ? perfil.sedes_administradas ?? [] : [],
  };
}
