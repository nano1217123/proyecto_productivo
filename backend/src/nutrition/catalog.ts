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

const ideas = [
  { id: "huevos-arepa", name: "Huevos con arepa y aguacate", minutes: 15, steps: "Cocina el huevo, calienta la arepa y sirve con aguacate.", ingredients: [[173424, 100], [168070, 70], [171705, 50]] },
  { id: "pollo-arroz", name: "Pollo con arroz, lentejas y tomate", minutes: 30, steps: "Sirve el pollo asado con arroz y lentejas cocidos. Acompaña con tomate fresco.", ingredients: [[171477, 100], [169757, 100], [172421, 90], [170457, 60]] },
  { id: "yogur-avena", name: "Yogur con avena y banano", minutes: 10, steps: "Mezcla el yogur con avena cocida y fría. Agrega el banano en rodajas.", ingredients: [[171284, 150], [173905, 80], [173944, 100]] },
  { id: "garbanzos-arroz", name: "Garbanzos con arroz y tomate", minutes: 20, steps: "Calienta el arroz y los garbanzos cocidos y agrega tomate picado al servir.", ingredients: [[173757, 120], [169757, 100], [170457, 80]] },
];

export function mealIdeas(profile?: FoodPreferences | null) {
  return ideas.flatMap(({ ingredients, ...idea }) => {
    const allocated = ingredients.map(([foodId, grams]) => ({ food: findFood(foodId), grams }));
    if (profile && allocated.some(({ food }) => !compatible(food, profile))) return [];
    return [{
      ...idea,
      ingredients: allocated.map(({ food, grams }) => ({ id: food.id, name: food.name, grams })),
      allergens: [...new Set(allocated.flatMap(({ food }) => food.allergens))],
      protein: twoDecimals(allocated.reduce((sum, { food, grams }) => sum + food.protein * grams / 100, 0)),
    }];
  });
}
