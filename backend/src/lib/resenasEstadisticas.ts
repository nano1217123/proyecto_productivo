const estrellas = [5, 4, 3, 2, 1] as const;

export function resumirValoraciones(conteos: ReadonlyMap<number, number>) {
  const valores = estrellas.map(valor => ({ valor, cantidad: conteos.get(valor) ?? 0 }));
  const total = valores.reduce((suma, { cantidad }) => suma + cantidad, 0);
  const puntos = valores.reduce((suma, { valor, cantidad }) => suma + valor * cantidad, 0);
  return {
    total,
    promedio: total ? puntos / total : null,
    distribucion: valores.map(dato => ({
      ...dato, proporcion: total ? dato.cantidad / total : null,
    })),
  };
}
