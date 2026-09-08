import express from 'express';
import rateLimit from 'express-rate-limit';
import { createAdmin } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Demasiados intentos desde esta IP, por favor intente de nuevo después de 15 minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// El login y el registro de clientes van directo contra Supabase Auth
// desde el frontend (AuthContext.jsx). Este backend solo expone la
// creación de administradores de gimnasio, y únicamente para un
// super_admin o desarrollador ya autenticado (no hay registro público
// de administradores).
router.post(
  '/create-admin',
  authLimiter,
  requireAuth,
  requireRole("super_admin", "desarrollador"),
  createAdmin
);

export default router;