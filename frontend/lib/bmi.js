/**
 * Módulo unificado de IMC (Índice de Masa Corporal).
 *
 * Antes estaba dividido entre:
 *   - features/home/lib/bmi.js     (getBmiStatus)
 *   - features/nutrition/lib/nutrition.js (calculateBmi)
 *
 * Ahora vive en lib/ porque es lógica transversal usada por múltiples
 * features (home, nutrition, y potencialmente otras en el futuro).
 */

/**
 * Calcula el IMC a partir de peso (kg) y estatura (cm).
 * Devuelve null si los valores están fuera de rango razonable.
 *
 * Fórmula: IMC = peso (kg) / estatura (m)^2
 *
 * @param {number|string} weightKg   Peso en kilogramos.
 * @param {number|string} heightCm   Estatura en centímetros.
 * @returns {number|null}
 */
export function calculateBmi(weightKg, heightCm) {
  const weight = Number(weightKg);
  const heightInMeters = Number(heightCm) / 100;
  const isValidWeight = Number.isFinite(weight) && weight >= 1 && weight <= 300;
  const isValidHeight =
    Number.isFinite(heightInMeters) && heightInMeters >= 0.5 && heightInMeters <= 2.5;
  if (!isValidWeight || !isValidHeight) return null;
  return weight / heightInMeters ** 2;
}

/**
 * Clasifica un valor de IMC en categorías estándar (OMS).
 *
 * @param {number} bmi
 * @returns {{ label: string, detail: string, tone: "low"|"normal"|"high" }}
 */
export function getBmiStatus(bmi) {
  if (bmi < 18.5) return { label: "Bajo peso", detail: "Posible desnutrición", tone: "low" };
  if (bmi < 25) return { label: "Peso normal", detail: "Rango saludable", tone: "normal" };
  if (bmi < 30) return { label: "Sobrepeso", detail: "Rango a vigilar", tone: "high" };
  if (bmi < 35) return { label: "Obesidad grado I", detail: "Consulta a un profesional", tone: "high" };
  if (bmi < 40) return { label: "Obesidad grado II", detail: "Consulta a un profesional", tone: "high" };
  return { label: "Obesidad grado III", detail: "Consulta a un profesional", tone: "high" };
}
