"use client";

export default function SetRow({ fila, numero, ejercicio, error, repeticionesRef, onUpdate, onRemove }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end p-3 border border-[#30332f] rounded-lg bg-[#171817]">
      <p className="col-span-2 self-center text-sm sm:col-span-1 font-bold text-[#f2f4ef]">Serie {numero}<span className="block sm:hidden">{ejercicio}</span></p>
      <label className="text-xs font-bold text-[#c0c7bd]">
        Repeticiones
        <input id={`reps-${fila.id}`} ref={repeticionesRef} type="number" inputMode="numeric" min="1" max="999" value={fila.repeticiones} onChange={(e) => onUpdate(fila.id, "repeticiones", e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${fila.id}` : undefined} className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm focus-visible:outline-2 focus-visible:outline-[#b56cff]" />
      </label>
      <label className="text-xs font-bold text-[#c0c7bd]">
        Peso (kg, opcional)
        <input type="number" inputMode="decimal" min="0" max="500" step="0.5" value={fila.pesoKg} onChange={(e) => onUpdate(fila.id, "pesoKg", e.target.value)} className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm focus-visible:outline-2 focus-visible:outline-[#b56cff]" />
      </label>
      <button type="button" onClick={() => onRemove(fila.id)} aria-label={`Quitar serie ${numero} de ${ejercicio}`} className="col-span-2 justify-self-start sm:col-span-1 min-h-10 px-3 py-2.5 border border-[rgba(255,121,121,.4)] rounded-md text-[#ff7979] text-xs font-semibold cursor-pointer transition hover:bg-[#351b1b] focus-visible:outline-2 focus-visible:outline-[#b56cff]">
        Quitar serie
      </button>
      {error && <p id={`error-${fila.id}`} className="col-span-full text-sm font-semibold text-[#ff7979]">{error}</p>}
    </div>
  );
}
