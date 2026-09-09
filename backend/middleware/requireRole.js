import { supabaseAdmin } from "../lib/supabaseAdmin.js";

// Debe usarse SIEMPRE después de requireAuth (necesita req.userId ya definido).
// Verifica el rol actual del usuario contra la tabla "usuarios" en cada
// solicitud (no confía en nada que venga del cliente/token), y solo deja
// pasar si su tipo_usuario está en la lista de roles permitidos.
export function requireRole(...allowedRoles) {
  return async function (req, res, next) {
    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("tipo_usuario")
      .eq("idusuario", req.userId)
      .single();

    if (error || !data) {
      return res.status(403).json({ message: "No se pudo verificar tu rol." });
    }

    if (!allowedRoles.includes(data.tipo_usuario)) {
      return res.status(403).json({ message: "No tienes permisos para realizar esta acción." });
    }

    req.userRole = data.tipo_usuario;
    next();
  };
}