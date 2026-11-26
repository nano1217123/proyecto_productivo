"use client";

// Aviso para funciones del panel que todavía no tienen API. No muestra
// formularios ni botones de acción: así nada parece completado sin backend.
export default function NoDisponible({ titulo, children }) {
  return (
    <div
      role="note"
      className="p-4 rounded-[10px] border border-[rgba(255,196,87,.35)] bg-[rgba(120,86,20,.15)] text-sm text-[#e8dcc4] leading-[1.55]"
    >
      <p className="m-0 mb-1 text-[11px] font-extrabold tracking-widest uppercase text-[#ffcf70]">
        Aún no disponible
      </p>
      {titulo && <p className="m-0 mb-1 font-bold text-[#f2f4ef]">{titulo}</p>}
      <div className="[&_p]:m-0 [&_p+p]:mt-2">{children}</div>
    </div>
  );
}
