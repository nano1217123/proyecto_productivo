export function validarSeries(filas, catalogo) {
  const iniciadas = filas.filter((fila) => fila.ejercicioId || fila.repeticiones !== "" || fila.pesoKg !== "");
  const idsDisponibles = new Set(catalogo.flatMap((grupo) =>
    grupo.ejercicios.map((ejercicio) => String(ejercicio.id)),
  ));
  const errores = {};

  for (const fila of iniciadas) {
    if (!fila.ejercicioId) errores[fila.id] = "Selecciona un ejercicio para esta serie.";
    else if (!idsDisponibles.has(fila.ejercicioId)) errores[fila.id] = "Este ejercicio no está disponible. Quita la serie y elige otro.";
    else if (!fila.repeticiones) errores[fila.id] = "Ingresa las repeticiones de esta serie.";
  }

  const series = [];
  if (Object.keys(errores).length === 0) {
    const contador = new Map();
    for (const fila of iniciadas) {
      const numero = (contador.get(fila.ejercicioId) ?? 0) + 1;
      contador.set(fila.ejercicioId, numero);
      series.push({
        ejercicio_id: Number(fila.ejercicioId),
        numero_serie: numero,
        repeticiones: Number(fila.repeticiones),
        peso_kg: fila.pesoKg ? Number(fila.pesoKg) : null,
      });
    }
  }

  return { errores, series };
}
