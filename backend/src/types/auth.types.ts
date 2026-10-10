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

// ============================================================
// REGISTRO PÚBLICO
// Cualquier persona puede registrarse como cliente desde /register.
// Los administradores se crean con createAdmin (requiere auth).
// ============================================================

// Tipos de usuario permitidos desde el registro público.
// "admin_gimnasio", "super_admin" y "desarrollador" NO se pueden
// pedir desde aquí.
export const TIPOS_REGISTRO_PUBLICO = ["cliente"] as const;
export type TipoRegistroPublico = (typeof TIPOS_REGISTRO_PUBLICO)[number];

// Datos de entrada ya validados y limpios para registrar un cliente.
export interface RegisterInput {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
}

// Resultado que devuelve el servicio al registrar.
export interface RegisterResult {
  message: string;
  userId: string;
}