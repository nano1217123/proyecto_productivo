import { z } from "zod";
import { AppError } from "../errors/AppError.js";

export const goals = ["mantener", "aumentar", "reducir"] as const;
export const meals = ["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena", "Otro"] as const;
export const allergens = ["huevo", "leche", "pescado", "soya", "maní", "gluten"] as const;

export const zone = z.string().max(64).refine((value) => {
  try { new Intl.DateTimeFormat("es", { timeZone: value }); return true; }
  catch { return false; }
});
export const date = z.iso.date();
export const id = z.uuid();
export const foodId = z.coerce.number().int().positive();
export const profileInput = z.strictObject({
  birthYear: z.number().int().min(1900).max(new Date().getUTCFullYear()),
  weight: z.number().min(20).max(300).optional(),
  activity: z.enum(["ocasional", "regular"]),
  goal: z.enum(goals),
  preference: z.enum(["todos", "vegetariana", "vegana"]),
  allergens: z.array(z.enum(allergens)).max(allergens.length),
  needsProfessional: z.boolean(),
  tracking: z.boolean(),
  zone,
});
export const entryInput = z.strictObject({
  foodId: z.number().int().positive(),
  quantity: z.number().positive().max(10000),
  unit: z.string().min(1).max(20),
  meal: z.enum(meals).nullable(),
  day: date,
});
export const createEntryInput = entryInput.extend({ requestId: id.optional() });
export const quoteInput = entryInput.pick({ quantity: true, unit: true, foodId: true });
export const historyInput = z.object({
  day: date,
  days: z.coerce.number().int().min(1).max(31).default(1),
  meal: z.enum(meals).optional(),
  foodId: foodId.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const catalogInput = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(60).optional(),
  origin: z.enum(["animal", "vegetal"]).optional(),
  sort: z.enum(["nombre", "proteina"]).default("nombre"),
  favorite: z.enum(["true", "false"]).optional(),
  compatible: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, "Revisa los datos enviados.");
  return result.data;
}
