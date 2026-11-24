// Tipos de usuario permitidos desde el registro público.
// Quien se registra desde la web es un usuario particular; "cliente"
// (alumno de gimnasio), "admin" y "super_admin" NO se pueden pedir desde aquí.
export const TIPOS_REGISTRO_PUBLICO = ["usuario_particular"] as const;
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