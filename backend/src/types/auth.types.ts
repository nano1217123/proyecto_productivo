// Tipos de usuario que este backend permite crear mediante la API.
// El super_admin puede crear tanto admin_gimnasio como otros super_admin.
// "desarrollador" sigue asignándose manualmente en la BD.
export const TIPOS_ADMIN_PERMITIDOS = ["admin_gimnasio", "super_admin"] as const;

export type TipoAdminPermitido = (typeof TIPOS_ADMIN_PERMITIDOS)[number];

// Datos de entrada ya validados y limpios para crear un administrador.
export interface CreateAdminInput {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  tipoUsuario: TipoAdminPermitido;
}

// Resultado que devuelve el servicio al crear un admin.
export interface CreateAdminResult {
  message: string;
  userId: string;
  emailSendError?: boolean;
}

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

export interface RegisterResult {
  message: string;
  userId: string;
  emailSendError?: boolean;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ResendCodeInput {
  email: string;
}

export interface MessageResult {
  message: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Datos del usuario que se devuelven al frontend (nunca el hash).
export interface SessionUser {
  idusuario: string;
  nombres: string;
  apellidos: string;
  tipoUsuario: string;
}

// Tokens que el controller convierte en cookies httpOnly.
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  user: SessionUser;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}