export const methodVersion = "issn-2017-v1";
export const methodSource = "https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/";

export function proteinReference(age: number, weight: number, activity: string, needsProfessional: boolean) {
  if (!Number.isInteger(age) || age < 18 || age > 64 || needsProfessional ||
      activity !== "regular" || !Number.isFinite(weight) || weight < 35 || weight > 150) {
    return null;
  }
  return { minimum: Math.round(weight * 1.4), maximum: Math.round(weight * 2) };
}

export function twoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

export function localDay(zone: string, instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  return ["year", "month", "day"].map((part) => parts.find(({ type }) => type === part)?.value).join("-");
}

export function gramsFromUnit(quantity: number, gramsPerUnit: number) {
  const grams = twoDecimals(quantity * gramsPerUnit);
  return Number.isFinite(grams) && grams >= 0.01 && grams <= 10000 ? grams : null;
}
