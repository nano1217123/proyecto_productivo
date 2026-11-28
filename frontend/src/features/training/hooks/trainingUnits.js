// Libras avoirdupois. La API y la base de datos usan kg.
const kgPerPound = 0.45359237;

export function toKilograms(value, unit) {
  if (value === "" || value == null) return null;
  return unit === "lb" ? Number((Number(value) * kgPerPound).toFixed(8)) : Number(value);
}

export function fromKilograms(value, unit) {
  if (value == null) return "";
  return unit === "lb" ? Number((value / kgPerPound).toFixed(5)) : value;
}
