import type { Request, RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { gestionService, type GestionService } from "../service/gestion.service.js";
import type { ActorGestion } from "../types/gestion.types.js";

function actor(req: Request): ActorGestion {
  if (!req.userId) throw new AppError(401, "No autorizado.");
  if (!req.userRole) throw new AppError(403, "No se pudo verificar tu rol.");
  return { id: req.userId, rol: req.userRole };
}

export function createGestionController(service: GestionService = gestionService) {
  return {
    // GET /api/sedes (público)
    catalogo: ((_req, res) => {
      res.status(200).json({ sedes: service.catalogoSedes() });
    }) satisfies RequestHandler,

    // GET /api/gestion/cuentas?correo=  (admin, super_admin)
    buscarCuenta: asyncHandler(async (req, res) => {
      actor(req);
      const cuenta = await service.buscarCuenta(res.locals.correo as string);
      res.set("Cache-Control", "no-store");
      return res.status(200).json({ cuenta });
    }) satisfies RequestHandler,

    // GET /api/gestion/clientes-sin-sede  (super_admin)
    clientesSinSede: asyncHandler(async (req, res) => {
      actor(req);
      const clientes = await service.listarClientesSinSede();
      return res.status(200).json({ clientes });
    }) satisfies RequestHandler,

    // GET /api/sedes/:slug/clientes
    listarClientes: asyncHandler(async (req, res) => {
      const clientes = await service.listarClientes(actor(req), res.locals.gymSlug as string);
      res.set("Cache-Control", "no-store");
      return res.status(200).json({ clientes });
    }) satisfies RequestHandler,

    // POST /api/sedes/:slug/clientes  { usuarioId, correo }
    vincularCliente: asyncHandler(async (req, res) => {
      const cuenta = await service.vincularCliente(actor(req), res.locals.gymSlug as string, res.locals.seleccion);
      return res.status(201).json({ message: "Cliente vinculado a la sede.", cuenta });
    }) satisfies RequestHandler,

    // DELETE /api/sedes/:slug/clientes/:usuarioId
    desvincularCliente: asyncHandler(async (req, res) => {
      await service.desvincularCliente(actor(req), res.locals.gymSlug as string, res.locals.usuarioId as string);
      return res.status(200).json({ message: "Cliente desvinculado. Su cuenta vuelve a usuario particular." });
    }) satisfies RequestHandler,

    // POST /api/auth/create-admin  { usuarioId, correo, gymSlugs }  (super_admin)
    asignarAdmin: asyncHandler(async (req, res) => {
      const resultado = await service.asignarAdmin(actor(req), res.locals.asignacion);
      return res.status(200).json(resultado);
    }) satisfies RequestHandler,
  };
}

export type GestionController = ReturnType<typeof createGestionController>;
export const gestionController = createGestionController();
