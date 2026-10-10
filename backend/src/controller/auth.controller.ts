import type { RequestHandler } from "express";
import { authService } from "../service/auth.service.js";
import { asyncHandler } from "../middleware/error.middleware.js";
//import type { CreateAdminInput } from "../types/auth.types.js";
import type { CreateAdminInput, RegisterInput } from "../types/auth.types.js";


export const createAdmin: RequestHandler = asyncHandler(async (req, res) => {
  // req.body ya pasó por validateCreateAdmin en la ruta.
  const result = await authService.createAdmin(req.body as CreateAdminInput);

  return res.status(201).json(result);
  
});

export const register: RequestHandler = asyncHandler(async (req, res) => {
  // req.body ya pasó por validateRegister en la ruta.
  const result = await authService.register(req.body as RegisterInput);

  return res.status(201).json(result);
});