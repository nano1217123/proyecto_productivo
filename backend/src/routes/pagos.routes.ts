import { Router, type RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  createPagosController,
  type PagosController,
} from "../controller/pagos.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { ROLES_PAGADORES } from "../service/pagos.service.js";
import { validateIniciarPago } from "../validator/pagos.validator.js";
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

interface PagosRouterDeps {
  auth: RequestHandler;
  roles: (...roles: TipoUsuario[]) => RequestHandler;
  controller: PagosController;
  limiter: RequestHandler;
}

export function createPagosRouter({
  auth = requireAuth,
  roles = requireRole,
  controller = createPagosController(),
  limiter = checkoutLimiter,
}: Partial<PagosRouterDeps> = {}) {
  const router = Router();

  // Todas las rutas requieren sesión y un rol pagador (admin o
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
