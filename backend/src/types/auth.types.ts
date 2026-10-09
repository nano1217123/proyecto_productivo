// Tipos de usuario que este backend permite crear mediante la API.
// "super_admin" y "desarrollador" se asignan manualmente en Supabase.
export const TIPOS_ADMIN_PERMITIDOS = ["admin_gimnasio"] as const;

export type TipoAdminPermitido = (typeof TIPOS_ADMIN_PERMITIDOS)[number];

// Datos de entrada ya validados y limpios para crear un administrador.
export interface CreateAdminInput {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  tipoUsuario: TipoAdminPermitido;
}