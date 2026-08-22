import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const router = Router();

// GET /api/perfil  (ejemplo de ruta protegida por el backend)
// Útil cuando necesitas lógica adicional que no debe vivir en el frontend
// (ej. cálculos internos, integraciones con otros servicios, panel admin).
router.get("/", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("*")
    .eq("idusuario", req.userId)
    .single();

  if (error) {
    return res.status(404).json({ message: "Perfil no encontrado." });
  }

  return res.status(200).json({ profile: data });
});

export default router;
