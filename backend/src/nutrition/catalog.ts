import { AppError } from "../errors/AppError.js";
import { foods, type Food } from "./foods.js";
import { gramsFromUnit, twoDecimals } from "./method.js";

export interface FoodPreferences {
  preference: string;
  allergens: string[];
}

export function compatible(food: Food, profile: FoodPreferences) {
  if (food.allergens.some((allergen) => profile.allergens.includes(allergen))) return false;
  if (profile.preference === "vegana") return food.origin === "vegetal";
  return profile.preference !== "vegetariana" || food.category !== "Animal" || food.allergens.includes("huevo");
}

export function findFood(id: number) {
  const food = foods.find((item) => item.id === id);
  if (!food) throw new AppError(404, "Alimento no disponible.");
  return food;
}

export function contribution(food: Food, quantity: number, unit: string) {
  const conversion = Object.hasOwn(food.units, unit) ? food.units[unit] : undefined;
  const grams = gramsFromUnit(quantity, conversion ?? 0);
  if (grams === null || quantity <= 0) throw new AppError(400, "Revisa la cantidad y la unidad del alimento.");
  return { grams, protein: twoDecimals(grams * food.protein / 100) };
}

const priorities: Record<string, string[]> = {
  mantener: ["Legumbres", "Animal", "Lácteos", "Verduras", "Cereales y tubérculos"],
  aumentar: ["Legumbres", "Animal", "Frutos secos y grasas", "Lácteos", "Cereales y tubérculos"],
  reducir: ["Legumbres", "Animal", "Verduras", "Lácteos", "Frutas"],
};

export function recommendations(profile: FoodPreferences & { goal: string; activity: string }) {
  return (priorities[profile.goal] ?? []).flatMap((category) => {
    const choices = foods.filter((food) => food.category === category && compatible(food, profile));
    const [food] = profile.activity === "regular"
      ? choices.sort((a, b) => b.protein * b.portion - a.protein * a.portion)
      : choices;
    if (!food) return [];
    const reason = category === "Legumbres" ? "Fuente de proteína vegetal para variar tus comidas."
      : category === "Animal" || category === "Lácteos" ? "Aporta proteína en una porción habitual."
      : "Opción para acompañar comidas variadas.";
    return [{ ...food, reason }];
  });
}
