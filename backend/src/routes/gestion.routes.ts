import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { gestionController as c } from "../controller/gestion.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import {
  validateBuscarCuenta,
  validateCuentaConfirmada,
  validateSedeParam,
  validateUsuarioIdParam,
} from "../validator/gestion.validator.js";

// Limita búsquedas y cambios por cuenta: evita recorrer correos.
const gestionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: { message: "Demasiadas solicitudes. Espera un momento." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
});

// /api/sedes
export const sedesRouter = Router();

// Catálogo público de sedes (nombres para la landing y los paneles).
sedesRouter.get("/", c.catalogo);

// Clientes de una sede: el admin de esa sede o un super_admin. La sede
// administrada se comprueba en el servicio contra admin_sedes.
sedesRouter.use("/:slug/clientes", requireAuth, requireRole("admin", "super_admin"), gestionLimiter);
sedesRouter.get("/:slug/clientes", validateSedeParam, c.listarClientes);
sedesRouter.post("/:slug/clientes", validateSedeParam, validateCuentaConfirmada, c.vincularCliente);
sedesRouter.delete(
  "/:slug/clientes/:usuarioId",
  validateSedeParam,
  validateUsuarioIdParam,
  c.desvincularCliente
);

// /api/gestion
export const gestionRouter = Router();
gestionRouter.use(requireAuth);

// Vista previa de una cuenta por correo exacto, para confirmar antes de
// vincularla (admin) o promoverla (super_admin).
gestionRouter.get(
  "/cuentas",
  requireRole("admin", "super_admin"),
  gestionLimiter,
  validateBuscarCuenta,
  c.buscarCuenta
);

// Clientes que aún no tienen sede registrada (gestión global).
gestionRouter.get("/clientes-sin-sede", requireRole("super_admin"), gestionLimiter, c.clientesSinSede);
