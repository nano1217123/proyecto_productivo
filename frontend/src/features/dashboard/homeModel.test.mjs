import assert from "node:assert/strict";
import { test } from "node:test";
import { greeting, localHomeDate, progressWeeks, trainingState, weekDays } from "./homeModel.js";

const today = "2026-11-23";
const empty = { active: null, history: { total: 0, ultimo: null }, routines: [], today };

test("inicio prioriza sesiones en curso, completadas y rutinas programadas", () => {
  const completed = { total: 1, ultimo: { fecha: today } };
  const routines = [{ dias: [1] }, { dias: [1, 3] }];
  assert.equal(trainingState(empty), "new");
  assert.equal(trainingState({ ...empty, history: undefined }), "free");
  assert.equal(trainingState({ ...empty, routines: [{ dias: [2] }] }), "free");
  assert.equal(trainingState({ ...empty, routines }), "scheduled");
  assert.equal(trainingState({ ...empty, history: completed, routines }), "completed");
  assert.equal(trainingState({ ...empty, history: completed, routines, active: {} }), "active");
});

test("la semana empieza el lunes y la gráfica solo utiliza sesiones registradas", () => {
  assert.deepEqual(weekDays("2026-01-01", -1), [
    "2025-12-22", "2025-12-23", "2025-12-24", "2025-12-25", "2025-12-26", "2025-12-27", "2025-12-28",
  ]);
  assert.deepEqual(progressWeeks(today, [{ fecha: today, sesiones: 2 }, { fecha: "2026-11-18", sesiones: 1 }])
    .map(({ count }) => count), [0, 0, 1, 2]);
});

test("el calendario y el saludo usan la fecha y hora locales", () => {
  assert.equal(localHomeDate(new Date(2026, 10, 23, 0, 15)), today);
  assert.deepEqual([0, 11, 12, 18, 19, 23].map(greeting),
    ["Buenos días", "Buenos días", "Buenas tardes", "Buenas tardes", "Buenas noches", "Buenas noches"]);
});
