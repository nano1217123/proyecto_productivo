import { getBmiStatus } from "@/features/home/lib/bmi";

export { getBmiStatus };

// IMC = peso (kg) / estatura (m)^2
export function calculateBmi(weightKg, heightCm) {
  const weight = Number(weightKg);
  const heightInMeters = Number(heightCm) / 100;
  if (!weight || !heightInMeters || weight <= 0 || heightInMeters <= 0) return null;
  return weight / heightInMeters ** 2;
}

export const goals = [
  { value: "bajar", label: "Bajar de peso", gramsPerKg: 1.6, hint: "Prioriza proteína magra para conservar músculo en déficit calórico." },
  { value: "mantener", label: "Mantener peso", gramsPerKg: 1.8, hint: "Un consumo moderado y constante ayuda a sostener tu composición corporal." },
  { value: "subir", label: "Subir de peso / ganar músculo", gramsPerKg: 2.2, hint: "Combina proteína con un extra de calorías para favorecer la ganancia muscular." },
];

export const goalByValue = Object.fromEntries(goals.map((goal) => [goal.value, goal]));

// Estimación general (no reemplaza a un nutricionista): gramos de proteína
// recomendados al día según el peso corporal y el objetivo de la persona.
export function getProteinTarget(weightKg, goalValue) {
  const weight = Number(weightKg);
  const goal = goalByValue[goalValue] || goalByValue.mantener;
  if (!weight || weight <= 0) return null;
  return Math.round(weight * goal.gramsPerKg);
}

// Catálogo de alimentos como opciones para elegir, no como obligación.
// proteinPerServing y caloriesApprox son valores de referencia por porción.
export const foods = [
  { name: "Pechuga de pollo", category: "Animal", serving: "150 g cocida", proteinPerServing: 35, caloriesApprox: 240, goalTags: ["bajar", "mantener", "subir"] },
  { name: "Huevo entero", category: "Animal", serving: "2 unidades", proteinPerServing: 13, caloriesApprox: 155, goalTags: ["bajar", "mantener", "subir"] },
  { name: "Claras de huevo", category: "Animal", serving: "4 unidades", proteinPerServing: 14, caloriesApprox: 70, goalTags: ["bajar"] },
  { name: "Atún en agua", category: "Animal", serving: "1 lata (140 g)", proteinPerServing: 30, caloriesApprox: 145, goalTags: ["bajar", "mantener"] },
  { name: "Salmón", category: "Animal", serving: "150 g cocido", proteinPerServing: 33, caloriesApprox: 310, goalTags: ["mantener", "subir"] },
  { name: "Carne de res magra", category: "Animal", serving: "150 g cocida", proteinPerServing: 36, caloriesApprox: 270, goalTags: ["mantener", "subir"] },
  { name: "Pavo molido", category: "Animal", serving: "150 g cocido", proteinPerServing: 34, caloriesApprox: 230, goalTags: ["bajar", "mantener"] },
  { name: "Pescado blanco (tilapia, mero)", category: "Animal", serving: "150 g cocido", proteinPerServing: 31, caloriesApprox: 150, goalTags: ["bajar"] },
  { name: "Yogur griego natural", category: "Lácteos", serving: "200 g", proteinPerServing: 20, caloriesApprox: 130, goalTags: ["bajar", "mantener", "subir"] },
  { name: "Queso cottage", category: "Lácteos", serving: "200 g", proteinPerServing: 22, caloriesApprox: 180, goalTags: ["bajar", "mantener"] },
  { name: "Leche entera", category: "Lácteos", serving: "1 vaso (250 ml)", proteinPerServing: 8, caloriesApprox: 150, goalTags: ["subir"] },
  { name: "Queso fresco", category: "Lácteos", serving: "50 g", proteinPerServing: 9, caloriesApprox: 140, goalTags: ["mantener", "subir"] },
  { name: "Batido de proteína (whey)", category: "Suplemento", serving: "1 scoop en agua o leche", proteinPerServing: 24, caloriesApprox: 120, goalTags: ["bajar", "mantener", "subir"] },
  { name: "Lentejas cocidas", category: "Vegetal", serving: "1 taza (200 g)", proteinPerServing: 18, caloriesApprox: 230, goalTags: ["bajar", "mantener", "subir"] },
  { name: "Garbanzos cocidos", category: "Vegetal", serving: "1 taza (200 g)", proteinPerServing: 15, caloriesApprox: 270, goalTags: ["mantener", "subir"] },
  { name: "Fríjoles negros cocidos", category: "Vegetal", serving: "1 taza (200 g)", proteinPerServing: 15, caloriesApprox: 225, goalTags: ["mantener", "subir"] },
  { name: "Tofu firme", category: "Vegetal", serving: "150 g", proteinPerServing: 18, caloriesApprox: 190, goalTags: ["bajar", "mantener", "subir"] },
  { name: "Edamame", category: "Vegetal", serving: "1 taza (155 g)", proteinPerServing: 17, caloriesApprox: 190, goalTags: ["bajar", "mantener"] },
  { name: "Quinoa cocida", category: "Vegetal", serving: "1 taza (185 g)", proteinPerServing: 8, caloriesApprox: 220, goalTags: ["mantener", "subir"] },
  { name: "Avena en hojuelas", category: "Vegetal", serving: "1 taza cocida (235 g)", proteinPerServing: 6, caloriesApprox: 165, goalTags: ["subir"] },
  { name: "Crema de maní (mantequilla de maní)", category: "Vegetal", serving: "2 cucharadas (32 g)", proteinPerServing: 8, caloriesApprox: 190, goalTags: ["subir"] },
  { name: "Almendras", category: "Vegetal", serving: "30 g (un puñado)", proteinPerServing: 6, caloriesApprox: 170, goalTags: ["subir"] },
];

export function getFoodsByGoal(goalValue) {
  return foods.filter((food) => food.goalTags.includes(goalValue));
}
