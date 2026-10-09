import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Este cliente usa la secret key: tiene privilegios de administrador y
// puede saltarse Row Level Security. NUNCA la expongas al frontend.
// Solo los repositorios deben importar este cliente.
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});