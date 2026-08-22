export function getBmiStatus(bmi) {
  if (bmi < 18.5) return { label: "Bajo peso", detail: "Posible desnutrición", tone: "low" };
  if (bmi < 25) return { label: "Peso normal", detail: "Rango saludable", tone: "normal" };
  if (bmi < 30) return { label: "Sobrepeso", detail: "Rango a vigilar", tone: "high" };
  if (bmi < 35) return { label: "Obesidad grado I", detail: "Consulta a un profesional", tone: "high" };
  if (bmi < 40) return { label: "Obesidad grado II", detail: "Consulta a un profesional", tone: "high" };
  return { label: "Obesidad grado III", detail: "Consulta a un profesional", tone: "high" };
}
