import { Router } from "express";
import { AppError } from "../errors/AppError.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { contribution, findFood } from "../nutrition/catalog.js";
import * as service from "../nutrition/service.js";
import * as input from "../nutrition/validation.js";

const router = Router();
router.use(requireAuth, (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("Sec-Fetch-Site") === "cross-site") {
    return next(new AppError(403, "Solicitud no autorizada."));
  }
  if (["POST", "PATCH"].includes(req.method) && !req.is("application/json")) {
    return next(new AppError(415, "Envía los datos en formato JSON."));
  }
  next();
});
router.get("/perfil", asyncHandler(async (req, res) => res.json(await service.profile(req.userId!))));
router.patch("/perfil", asyncHandler(async (req, res) =>
  res.json(await service.saveProfile(req.userId!, input.validate(input.profileInput, req.body)))));
router.get("/alimentos", asyncHandler(async (req, res) =>
  res.json(await service.catalog(req.userId!, input.validate(input.catalogInput, req.query)))));
router.get("/alimentos/:id", asyncHandler(async (req, res) => res.json(findFood(input.validate(input.foodId, req.params.id)))));
router.get("/recomendaciones", asyncHandler(async (req, res) => res.json(await service.suggested(req.userId!))));
router.post("/aporte", asyncHandler(async (req, res) => {
  const { foodId, quantity, unit } = input.validate(input.quoteInput, req.body);
  res.json(contribution(findFood(foodId), quantity, unit));
}));
router.get("/registros", asyncHandler(async (req, res) =>
  res.json(await service.history(req.userId!, input.validate(input.historyInput, req.query)))));
router.post("/registros", asyncHandler(async (req, res) =>
  res.status(201).json(await service.saveEntry(req.userId!, input.validate(input.entryInput, req.body)))));
router.patch("/registros/:id", asyncHandler(async (req, res) =>
  res.json(await service.saveEntry(req.userId!, input.validate(input.entryInput, req.body), input.validate(input.id, req.params.id)))));
router.delete("/registros/:id", asyncHandler(async (req, res) => {
  await service.removeEntry(req.userId!, input.validate(input.id, req.params.id));
  res.sendStatus(204);
}));
router.put("/favoritos/:id", asyncHandler(async (req, res) => {
  await service.favorite(req.userId!, input.validate(input.foodId, req.params.id), true);
  res.sendStatus(204);
}));
router.delete("/favoritos/:id", asyncHandler(async (req, res) => {
  await service.favorite(req.userId!, input.validate(input.foodId, req.params.id), false);
  res.sendStatus(204);
}));

export default router;
