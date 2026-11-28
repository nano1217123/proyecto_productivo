const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const porcentaje = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });

export default function ResumenResenas({ estadisticas }) {
  const { promedio, total, distribucion } = estadisticas;
  return (
    <section aria-labelledby="valoracion-sede" className="mb-5 rounded-xl border border-[#41433f] bg-[#212320] p-5">
      <h3 id="valoracion-sede" className="mb-3 font-bold">Valoración de la sede</h3>
      <p className="text-xl font-bold text-[#d5ad55]">
        {promedio === null ? "Sin valoraciones" : `${decimal.format(promedio)} de 5`}
      </p>
      <p className="mb-4 text-sm">{total} {total === 1 ? "reseña" : "reseñas"}</p>
      <ul className="grid gap-2 text-sm">
        {distribucion.map(({ valor, cantidad, proporcion }) => (
          <li key={valor} className="grid grid-cols-[auto_minmax(2rem,1fr)_auto] items-center gap-2">
            <span>{valor} {valor === 1 ? "estrella" : "estrellas"}</span>
            <meter className="w-full accent-[#d5ad55]" min={0} max={1} value={proporcion ?? 0}
              aria-label={`Proporción de reseñas de ${valor} ${valor === 1 ? "estrella" : "estrellas"}`} />
            <span className="text-right tabular-nums">{cantidad} · {proporcion === null ? "—" : porcentaje.format(proporcion)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
