import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Limita los intentos sobre endpoints sensibles de autenticación,
// contados por IP. Responde siempre con la forma { message }.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    message:
      "Demasiados intentos desde esta IP, por favor intente de nuevo después de 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limita las consultas de perfil. Se aplica DESPUÉS de requireAuth, así que
// se cuenta por usuario (req.userId) y no por IP. Si por algún motivo no
// hubiera usuario, cae a la IP.
export const perfilLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  message: {
    message: "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});