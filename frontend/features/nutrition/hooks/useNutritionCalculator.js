import { useMemo, useState } from "react";
import { calculateBmi, getBmiStatus } from "@/lib/bmi";
import { getProteinTarget, goals, getFoodsByGoal } from "../lib/nutrition";

export function useNutritionCalculator() {
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [goal, setGoal] = useState("mantener");
  const [selectedFoods, setSelectedFoods] = useState(() => new Set());

  const bmi = useMemo(() => calculateBmi(weight, height), [weight, height]);
  const bmiStatus = bmi ? getBmiStatus(bmi) : null;
  const proteinTarget = useMemo(() => getProteinTarget(weight, goal), [weight, goal]);
  const goalInfo = goals.find((item) => item.value === goal);
  const availableFoods = useMemo(() => getFoodsByGoal(goal), [goal]);

  const totalProtein = useMemo(
    () => availableFoods.filter((food) => selectedFoods.has(food.name)).reduce((sum, food) => sum + food.proteinPerServing, 0),
    [availableFoods, selectedFoods]
  );
  
  const progressPercent = proteinTarget ? Math.min(100, Math.round((totalProtein / proteinTarget) * 100)) : 0;
  const goalReached = proteinTarget && totalProtein >= proteinTarget;

  function toggleFood(name) {
    setSelectedFoods((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return {
    weight, setWeight,
    height, setHeight,
    goal, setGoal,
    bmi, bmiStatus,
    proteinTarget, goalInfo,
    availableFoods, selectedFoods,
    totalProtein, progressPercent, goalReached,
    toggleFood
  };
}
