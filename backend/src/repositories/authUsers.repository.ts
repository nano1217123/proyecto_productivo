import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabase.js";

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
}

export interface CreateAuthUserInput {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  tipoUsuario: string;
}

// El repositorio no decide qué hacer ante un fallo: devuelve el resultado
// y el servicio lo traduce a un AppError.
export type CreateAuthUserResult =
  | { ok: true; userId: string }
  | { ok: false; status: number | undefined; message: string };

// Acceso a Supabase Auth (usuarios de autenticación, no la tabla "usuarios").
export function createAuthUsersRepository(db: SupabaseClient = supabaseAdmin) {
  return {
    // Valida el token y devuelve el usuario, o null si es inválido o expiró.
    async findByToken(token: string): Promise<AuthenticatedUser | null> {
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email };
    },

    // Crea el usuario sin confirmar su correo y guarda sus datos como metadata.
    async create(input: CreateAuthUserInput): Promise<CreateAuthUserResult> {
      const { data, error } = await db.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: false,
        user_metadata: {
          nombres: input.nombres,
          apellidos: input.apellidos,
          tipo_usuario: input.tipoUsuario,
        },
      });

      if (error) {
        return { ok: false, status: error.status, message: error.message };
      }
      return { ok: true, userId: data.user.id };
    },

    // Reenvía el código de verificación. true si se envió, false si falló.
    async resendSignupEmail(email: string): Promise<boolean> {
      const { error } = await db.auth.resend({ type: "signup", email });
      return !error;
    },
  };
}

export type AuthUsersRepository = ReturnType<typeof createAuthUsersRepository>;

export const authUsersRepository = createAuthUsersRepository();