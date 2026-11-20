// Roles válidos del sistema.
// - cliente            → alumno de un gimnasio
// - usuario_particular → usuario registrado desde la web que entrena por su cuenta (en casa)
// - admin              → administrador de un gimnasio (futuro)
// - super_admin        → desarrolladores/equipo técnico
export const ROLES_VALIDOS = ["cliente", "usuario_particular", "admin", "super_admin"] as const;

export type TipoUsuario = (typeof ROLES_VALIDOS)[number];

// Columnas de "usuarios" que expone GET /api/perfil.
export interface PerfilUsuario {
  idusuario: string;
  nombres: string;
  apellidos: string;
  tipo_usuario: TipoUsuario;
  tiempo_registrado: unknown;
  tiempo_duracion_inscripcion: unknown;
}