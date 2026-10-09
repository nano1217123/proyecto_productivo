// Valor de la columna tipo_usuario (ej. "super_admin", "desarrollador", "admin_gimnasio").
export type TipoUsuario = string;

// Columnas de "usuarios" que expone GET /api/perfil.
export interface PerfilUsuario {
  idusuario: string;
  nombres: string;
  apellidos: string;
  tipo_usuario: TipoUsuario;
  tiempo_registrado: unknown;
  tiempo_duracion_inscripcion: unknown;
}