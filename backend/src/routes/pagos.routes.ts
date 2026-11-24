import { Router, type RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  createPagosController,
  type PagosController,
} from "../controller/pagos.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { ROLES_PAGADORES } from "../service/pagos.service.js";
import {
  validateEventoWompi,
  validateIniciarPago,
} from "../validator/pagos.validator.js";
import type { TipoUsuario } from "../types/usuario.types.js";

// Limita la creación de intentos de pago por usuario.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    message: "Demasiados intentos de pago. Espera unos minutos e inténtalo de nuevo.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});

// Límite generoso por IP para el webhook: Wompi envía pocos eventos, pero
// el endpoint es público.
const wompiWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  message: { message: "Demasiadas solicitudes." },
  standardHeaders: true,
  legacyHeaders: false,
});

interface PagosRouterDeps {
  auth: RequestHandler;
  roles: (...roles: TipoUsuario[]) => RequestHandler;
  controller: PagosController;
  limiter: RequestHandler;
  webhookLimiter: RequestHandler;
}

export function createPagosRouter({
  auth = requireAuth,
  roles = requireRole,
  controller = createPagosController(),
  limiter = checkoutLimiter,
  webhookLimiter = wompiWebhookLimiter,
}: Partial<PagosRouterDeps> = {}) {
  const router = Router();

  // Webhook de Wompi: público y sin sesión. Se registra antes de requireAuth;
  // la autenticidad del evento se comprueba con su firma y consultando la
  // transacción a Wompi.
  router.post(
    "/wompi/webhook",
    webhookLimiter,
    validateEventoWompi,
    controller.webhookWompi
  );

  // El resto de rutas requieren sesión y un rol pagador (admin o
  // usuario_particular). cliente y super_admin reciben 403.
  router.use(auth);
  router.use(roles(...ROLES_PAGADORES));

  router.get("/opciones", controller.listarOpciones);

  router.post(
    "/wompi/checkout",
    limiter,
    validateIniciarPago,
    controller.iniciarCheckoutWompi
  );

  return router;
}

export default createPagosRouter();
