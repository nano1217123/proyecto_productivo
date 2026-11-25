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
  validateConciliarPago,
  validateConsultaEstadoPago,
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

// Consulta de estado: la página de resultado la repite cada pocos segundos
// mientras el pago está pendiente, así que tiene su propio límite.
const estadoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  message: { message: "Demasiadas consultas. Espera un momento." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});

// Conciliación: cada solicitud puede consultar la API de Wompi. Además de
// este límite por usuario, el servicio consulta a Wompi como mucho una vez
// cada ESPERA_CONCILIACION_MS por intento.
const conciliacionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  message: { message: "Demasiadas verificaciones del pago. Espera un momento." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});

interface PagosRouterDeps {
  auth: RequestHandler;
  roles: (...roles: TipoUsuario[]) => RequestHandler;
  controller: PagosController;
  limiter: RequestHandler;
  webhookLimiter: RequestHandler;
  statusLimiter: RequestHandler;
  reconcileLimiter: RequestHandler;
}

export function createPagosRouter({
  auth = requireAuth,
  roles = requireRole,
  controller = createPagosController(),
  limiter = checkoutLimiter,
  webhookLimiter = wompiWebhookLimiter,
  statusLimiter = estadoLimiter,
  reconcileLimiter = conciliacionLimiter,
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

  router.get(
    "/estado",
    statusLimiter,
    validateConsultaEstadoPago,
    controller.consultarEstado
  );

  router.post(
    "/conciliar",
    reconcileLimiter,
    validateConciliarPago,
    controller.conciliarPago
  );

  router.post(
    "/wompi/checkout",
    limiter,
    validateIniciarPago,
    controller.iniciarCheckoutWompi
  );

  return router;
}

export default createPagosRouter();
