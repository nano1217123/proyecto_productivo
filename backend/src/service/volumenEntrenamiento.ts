type Serie = {
  completada: boolean;
  peso_kg?: number | null;
  repeticiones?: number | null;
};

export const tiposConVolumen = ["fuerza", "carga_adicional"] as const;

export function volumenRegistrado(series: Serie[], tipo: string) {
  if (!tiposConVolumen.some((valor) => valor === tipo)) return null;
  let volumen: number | null = null;
  for (const serie of series) {
    const { completada, peso_kg: peso, repeticiones } = serie;
    if (completada && peso != null && peso >= 0 && repeticiones != null && repeticiones > 0) {
      volumen = (volumen ?? 0) + peso * repeticiones;
    }
  }
  return volumen;
}
