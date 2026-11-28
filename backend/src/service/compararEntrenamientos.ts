import { volumenRegistrado } from "./volumenEntrenamiento.js";
import type { detalleHistorial } from "../repositories/historial.repository.js";

type Sesion = Awaited<ReturnType<typeof detalleHistorial>>;
type Ejercicio = Sesion["sesion"]["ejercicios"][number];
type Serie = Ejercicio["series"][number] & {
  duracion_seg?: number | null; distancia_km?: number | null; asistencia_kg?: number | null;
};

function total(series: Serie[], campo: "repeticiones" | "distancia_km" | "duracion_seg") {
  const valores = series.map((serie) => serie[campo]);
  return valores.every((valor) => valor != null) && valores.length
    ? valores.reduce<number>((suma, valor) => suma + (valor ?? 0), 0) : null;
}

export function diferencia(anterior: number | null, reciente: number | null) {
  const cambio = anterior != null && reciente != null ? reciente - anterior : null;
  return { anterior, reciente, cambio, porcentaje: anterior && cambio != null ? cambio / anterior * 100 : null };
}

export function prepararComparacion(a: Sesion, b: Sesion) {
  function medidas(sesion: Sesion) {
    const ejercicios = new Map<string, { ejercicio: Ejercicio; series: Serie[] }>();
    for (const ejercicio of sesion.sesion.ejercicios) {
      const clave = `${ejercicio.ejercicio_id}:${ejercicio.tipo}`;
      const entrada = ejercicios.get(clave) ?? { ejercicio, series: [] };
      entrada.series.push(...ejercicio.series.filter((serie) => serie.completada));
      ejercicios.set(clave, entrada);
    }
    const series = [...ejercicios.values()].flatMap((item) => item.series);
    const tiempo = sesion.finalizadoEn && sesion.iniciadoEn
      ? Math.max(0, (sesion.finalizadoEn.getTime() - sesion.iniciadoEn.getTime()) / 1000) : null;
    return { ejercicios, series, tiempo };
  }
  const izquierda = medidas(a);
  const derecha = medidas(b);
  const comparables = izquierda.ejercicios.size === derecha.ejercicios.size &&
    [...izquierda.ejercicios.keys()].every((clave) => derecha.ejercicios.has(clave));
  const volumen = (items: ReturnType<typeof medidas>) => {
    const valores = [...items.ejercicios.values()].map(({ series, ejercicio }) => volumenRegistrado(series, ejercicio.tipo));
    const tipos = new Set([...items.ejercicios.values()].map(({ ejercicio }) => ejercicio.tipo));
    return tipos.size === 1 && valores.every((valor) => valor != null)
      ? valores.reduce<number>((suma, valor) => suma + (valor ?? 0), 0) : null;
  };
  const general = {
    Duración: diferencia(izquierda.tiempo, derecha.tiempo),
    Ejercicios: diferencia(a.sesion.ejercicios.length, b.sesion.ejercicios.length),
    Series: diferencia(izquierda.series.length, derecha.series.length),
    Repeticiones: diferencia(total(izquierda.series, "repeticiones"), total(derecha.series, "repeticiones")),
    Volumen: diferencia(comparables ? volumen(izquierda) : null, comparables ? volumen(derecha) : null),
    Récords: diferencia(a.mejoras.length, b.mejoras.length),
  };
  const ejercicios = [...izquierda.ejercicios].flatMap(([clave, item]) => {
    const otro = derecha.ejercicios.get(clave);
    if (!otro) return [];
    const { ejercicio, series } = item;
    const maximo = (sets: Serie[]) => {
      const pesos = sets.map((serie) => serie.peso_kg).filter((peso) => peso != null);
      return pesos.length ? Math.max(...pesos) : null;
    };
    const cargas = [...new Set(series.map((s) => s.peso_kg).filter((peso) => peso != null))]
      .filter((peso) => otro.series.some((s) => s.peso_kg === peso));
    return [{
      clave, tipo: ejercicio.tipo, nombre: a.catalogo[String(ejercicio.ejercicio_id)]?.nombre,
      metricas: {
        Series: diferencia(series.length, otro.series.length),
        "Peso máximo": diferencia(maximo(series), maximo(otro.series)),
        Volumen: diferencia(volumenRegistrado(series, ejercicio.tipo), volumenRegistrado(otro.series, ejercicio.tipo)),
        Duración: diferencia(total(series, "duracion_seg"), total(otro.series, "duracion_seg")),
        Distancia: diferencia(total(series, "distancia_km"), total(otro.series, "distancia_km")),
        ...Object.fromEntries(cargas.map((peso) => [
          `Repeticiones con ${peso} kg`, diferencia(total(series.filter((s) => s.peso_kg === peso), "repeticiones"),
            total(otro.series.filter((s) => s.peso_kg === peso), "repeticiones")),
        ])),
      },
    }];
  });
  return { general, ejercicios };
}
