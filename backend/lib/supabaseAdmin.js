import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env");
}

// Este cliente usa la secret key: tiene privilegios de administrador y
// puede saltarse Row Level Security. NUNCA la expongas al frontend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
