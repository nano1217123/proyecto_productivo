"use client";

export default function SetRow({ fila, catalogo, onUpdate, onRemove, canRemove }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-3 items-end p-4 border border-[#30332f] rounded-lg bg-[#171817]">
      <label className="text-xs font-bold text-[#c0c7bd]">
        Ejercicio
        <select value={fila.ejercicioId} onChange={(e) => onUpdate(fila.id, "ejercicioId", e.target.value)} required className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]">
          <option value="">Selecciona un ejercicio</option>
          {catalogo.map((grupo) => (
            <optgroup key={grupo.slug} label={grupo.nombre}>
              {grupo.ejercicios.map((ej) => (
                <option key={ej.id} value={ej.id}>{ej.nombre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold text-[#c0c7bd]">
        Repeticiones
        <input type="number" min="1" max="999" value={fila.repeticiones} onChange={(e) => onUpdate(fila.id, "repeticiones", e.target.value)} required className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]" />
      </label>
      <label className="text-xs font-bold text-[#c0c7bd]">
        Peso (kg)
        <input type="number" min="0" max="500" step="0.5" value={fila.pesoKg} onChange={(e) => onUpdate(fila.id, "pesoKg", e.target.value)} className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]" />
      </label>
      <button type="button" onClick={() => onRemove(fila.id)} disabled={!canRemove} className="px-3 py-2.5 border border-[rgba(255,121,121,.4)] rounded-md text-[#ff7979] text-xs font-semibold cursor-pointer transition hover:bg-[#351b1b] disabled:opacity-40 disabled:cursor-not-allowed">
        Quitar
      </button>
    </div>
  );
}
