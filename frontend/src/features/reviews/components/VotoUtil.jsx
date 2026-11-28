export default function VotoUtil({ resena, pendiente, error, alCambiar }) {
  if (typeof resena.votos_utiles !== "number") return null;
  const { votos_utiles, mi_voto_util, puede_votar } = resena;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      {puede_votar ? (
        <button type="button" aria-pressed={mi_voto_util} disabled={pendiente}
          className="min-h-11 rounded-md border border-[#41463f] px-3 font-semibold aria-pressed:border-[#b56cff] aria-pressed:text-[#d7adff] disabled:opacity-50"
          onClick={() => void alCambiar(!mi_voto_util)}>
          Útil
        </button>
      ) : <span className="font-semibold">Útil</span>}
      <span aria-live="polite" className="tabular-nums">{votos_utiles} {votos_utiles === 1 ? "voto" : "votos"}</span>
      {!puede_votar && mi_voto_util && <span className="text-[#a9afa7]">Tu voto se conserva</span>}
      {error && <span role="alert" className="text-red-300">{error}</span>}
    </div>
  );
}
