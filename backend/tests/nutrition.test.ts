import assert from "node:assert/strict";
import { test } from "node:test";
import { compatible, contribution, findFood, mealIdeas, recommendations } from "../src/nutrition/catalog.js";
import { foods } from "../src/nutrition/foods.js";
import { gramsFromUnit, localDay, proteinReference } from "../src/nutrition/method.js";

test("el intervalo ISSN depende del peso y se limita a adultos sanos con entrenamiento regular", () => {
  assert.deepEqual(proteinReference(30, 70, "regular", false), { minimum: 98, maximum: 140 });
  for (const args of [[17, 70, "regular", false], [65, 70, "regular", false], [30, 70, "regular", true],
    [30, 70, "ocasional", false], [30, 151, "regular", false], [30, NaN, "regular", false]] as const) {
    assert.equal(proteinReference(...args), null);
  }
});

test("convierte huevo por unidad, legumbres por taza y leche por volumen", () => {
  assert.deepEqual(contribution(findFood(173424), 2, "unidad"), { grams: 100, protein: 12.58 });
  assert.deepEqual(contribution(findFood(172421), .5, "taza"), { grams: 99, protein: 8.93 });
  assert.equal(contribution(findFood(171265), 236.5882365, "ml").grams, 244);
  assert.throws(() => contribution(findFood(173424), 1, "ml"));
  assert.throws(() => contribution(findFood(173424), 1, "constructor"));
  assert.throws(() => contribution(findFood(173424), -1, "unidad"));
  assert.equal(gramsFromUnit(10001, 1), null);
});

test("día local correcto al cambiar de fecha UTC", () => {
  const instant = new Date("2026-11-27T02:30:00Z");
  assert.equal(localDay("America/Bogota", instant), "2026-11-26");
  assert.equal(localDay("Asia/Tokyo", instant), "2026-11-27");
});

test("recomendaciones y comidas respetan preferencias y alérgenos conocidos", () => {
  const profile = { preference: "vegana", allergens: ["soya", "maní"], activity: "regular" };
  for (const goal of ["mantener", "aumentar", "reducir"]) {
    const choices = recommendations({ ...profile, goal });
    assert.ok(choices.length);
    assert.equal(new Set(choices.map((food) => food.category)).size, choices.length);
    assert.ok(choices.every((food) => food.reason && compatible(food, profile)));
  }
  assert.ok(mealIdeas(profile).every((idea) => idea.ingredients.every(({ id }) => compatible(findFood(id), profile))));
  assert.equal(new Set(foods.map(({ id }) => id)).size, foods.length);
  for (const food of foods) {
    assert.match(food.source, new RegExp(`/${food.id}/nutrients$`));
    assert.ok([food.protein, food.carbs, food.fat].every((value) => Number.isFinite(value) && value >= 0 && value <= 100));
  }
});
