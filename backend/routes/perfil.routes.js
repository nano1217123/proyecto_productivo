import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.middleware.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const router = Router();

// Ya requiere estar autenticado, así que puede ser más permisivo que el de
// /api/auth/register; aun así, sin ningún límite un usuario autenticado
// podría hacer polling agresivo a este endpoint sin restricción alguna.
// Se limita por usuario (no por IP) ya que corre después de requireAuth.
const perfilLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    message: "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId,
});

// GET /api/perfil  (ejemplo de ruta protegida por el backend)
// Útil cuando necesitas lógica adicional que no debe vivir en el frontend
// (ej. cálculos internos, integraciones con otros servicios, panel admin).
router.get("/", requireAuth, perfilLimiter, async (req, res) => {
  // Lista explícita de columnas (en vez de "*"): esta ruta usa el cliente
  // con rol de servicio (sin RLS), así que si en el futuro se agrega una
  // columna interna/sensible a "usuarios", no se expone aquí por accidente.
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("idusuario, nombres, apellidos, tipo_usuario, tiempo_registrado, tiempo_duracion_inscripcion")
    .eq("idusuario", req.userId)
    .single();

  if (error) {
    return res.status(404).json({ message: "Perfil no encontrado." });
  }

  return res.status(200).json({ profile: data });
});

export default router;
