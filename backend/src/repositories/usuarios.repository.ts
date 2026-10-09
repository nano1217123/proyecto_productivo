import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../errors/AppError.js";
import type { PerfilUsuario, TipoUsuario } from "../types/usuario.types.js";

// Código de PostgREST cuando .single() no encuentra ninguna fila.
const NOT_FOUND_CODE = "PGRST116";

// Columnas de "usuarios" que expone el perfil. Lista explícita (nunca "*"):
// este cliente se salta RLS, así que una columna interna nueva no debe
// filtrarse por accidente.
const PERFIL_COLUMNS =
  "idusuario, nombres, apellidos, tipo_usuario, tiempo_registrado, tiempo_duracion_inscripcion";

// Trata un error de PostgREST: "no encontrado" no es un fallo (devuelve null);
// cualquier otro se registra con detalle en el servidor y al cliente solo
// le llega un mensaje genérico, sin información interna de la base de datos.
function handleQueryError(error: PostgrestError, accion: string): null {
  if (error.code === NOT_FOUND_CODE) return null;

  console.error(`Error de base de datos al ${accion}:`, error.message);
  throw new AppError(500, "Error al consultar la base de datos.");
}

// Factory function: permite inyectar otro cliente en las pruebas.
export function createUsuariosRepository(db: SupabaseClient = supabaseAdmin) {
  return {
    // Devuelve el rol del usuario, o null si no existe.
    async findRoleById(idUsuario: string): Promise<TipoUsuario | null> {
      const { data, error } = await db
        .from("usuarios")
        .select("tipo_usuario")
        .eq("idusuario", idUsuario)
        .single();

      if (error) return handleQueryError(error, "obtener el rol");

      return data ? (data.tipo_usuario as TipoUsuario) : null;
    },

    // Devuelve el perfil, o null si no existe.
    async findProfileById(idUsuario: string): Promise<PerfilUsuario | null> {
      const { data, error } = await db
        .from("usuarios")
        .select(PERFIL_COLUMNS)
        .eq("idusuario", idUsuario)
        .single();

      if (error) return handleQueryError(error, "obtener el perfil");

      return data as PerfilUsuario | null;
    },
  };
}

export type UsuariosRepository = ReturnType<typeof createUsuariosRepository>;

// Instancia por defecto para producción.
export const usuariosRepository = createUsuariosRepository();