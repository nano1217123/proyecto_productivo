import assert from "node:assert/strict";
import { test } from "node:test";
import { civilToday, monthRange, weekStart, dayLabel } from "./historyDates.js";

test("las sesiones cruzan la medianoche según Bogotá y conservan la fecha civil al formatear", () => {
  assert.equal(civilToday(new Date("2026-11-28T04:59:59Z")), "2026-11-27");
  assert.equal(civilToday(new Date("2026-11-28T05:00:00Z")), "2026-11-28");
  assert.equal(weekStart("2026-01-04"), "2025-12-29");
  assert.equal(dayLabel("2026-11-27", { day: "numeric" }), "27");
});

test("el calendario cambia de año y conserva los días de febrero bisiesto", () => {
  assert.deepEqual(monthRange("2026-01-15", -1), { desde: "2025-12-01", hasta: "2025-12-31" });
  assert.deepEqual(monthRange("2024-02-15"), { desde: "2024-02-01", hasta: "2024-02-29" });
});

test("las correcciones convierten libras a kg y conservan valores ausentes", async () => {
  const { fromKilograms, toKilograms } = await import("./trainingUnits.js");
  assert.equal(toKilograms(100, "lb"), 45.359237);
  assert.equal(fromKilograms(45.359237, "lb"), 100);
  assert.equal(toKilograms(60, "kg"), 60);
  assert.equal(toKilograms("", "lb"), null);
  assert.equal(fromKilograms(null, "lb"), "");
});
