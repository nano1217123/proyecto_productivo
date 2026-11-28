export const goals = {
  mantener: { icon: "↔", name: "Mantener peso", description: "Alimentación variada para acompañar tu rendimiento y recuperación." },
  aumentar: { icon: "↗", name: "Aumentar peso", description: "Alimentación suficiente y variada para acompañar el entrenamiento y la ganancia muscular." },
  reducir: { icon: "↘", name: "Reducir peso", description: "Hábitos sostenibles y comidas equilibradas para cuidar la masa muscular." },
};
export const meals = ["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena", "Otro"];
export const allergens = ["huevo", "leche", "pescado", "soya", "maní", "gluten"];
export const format = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
export const grams = (value) => `${format.format(value)} g`;
