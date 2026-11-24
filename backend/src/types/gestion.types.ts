// Tipos de la gestión de roles y sedes (clientes, admins, super_admin).
import type { TipoUsuario } from "./usuario.types.js";

// Quién realiza la operación (ya autenticado y con su rol leído de la base).
export interface ActorGestion {
  id: string;
  rol: TipoUsuario;
}

// Cuenta tal como la ve quien la va a vincular o promover, para confirmar
// que eligió la cuenta correcta antes de cambiarla.
export interface VistaCuenta {
  idusuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  provider: string;
  email_verified: boolean;
  tipo_usuario: TipoUsuario;
  // Sede del cliente (miembros_sede) o null.
  sede: string | null;
  // Sedes que administra (admin_sedes).
  sedes_administradas: string[];
  // Pagos personales aprobados. Informativo: aún no existe un mecanismo de
  // suscripción personal activa (ver BACKEND.md, «Cambio de rol y
  // suscripciones personales»).
  pagos_personales_aprobados: number;
}

// Cliente de una sede, para el listado del panel.
export interface ClienteSede {
  idusuario: string;
  nombres: string;
  apellidos: string;
  correo: string;
  provider: string;
  vinculado_en: Date;
}

// Selección confirmada: el id y el correo deben corresponder a la misma
// cuenta. Así no se cambia una cuenta distinta a la que se revisó.
export interface CuentaConfirmada {
  usuarioId: string;
  correo: string;
}

export interface AsignarAdminInput extends CuentaConfirmada {
  gymSlugs: string[];
}

export type AccionAuditoria =
  | "vincular_cliente"
  | "desvincular_cliente"
  | "asignar_admin"
  | "asignar_super_admin";

export type OrigenAuditoria = "api" | "cli";
