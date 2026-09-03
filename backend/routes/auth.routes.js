import express from 'express';
import rateLimit from 'express-rate-limit';
import { register } from '../controllers/auth.controller.js';

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

// El login de clientes/administradores va directo contra Supabase Auth
// desde el frontend (AuthContext.jsx); este backend solo expone el
// registro con clave de administrador.
router.post('/register', authLimiter, register);

export default router;