import { supabaseAdmin } from "../lib/supabaseAdmin.js";


export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado. Falta el token." });
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: "Token inválido o expirado." });
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email;
  next();
}
