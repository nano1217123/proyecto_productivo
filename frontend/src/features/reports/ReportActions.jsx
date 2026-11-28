export function BotonesDescarga({ disabled, cargando }) {
  const base = "inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold enabled:cursor-pointer enabled:shadow-sm enabled:active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lime)] disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-[background-color,box-shadow,transform] motion-safe:enabled:active:translate-y-px";
  return ["csv", "pdf"].map(formato => (
    <button key={formato} type="submit" value={formato} disabled={disabled || cargando}
      className={base + (formato === "pdf"
        ? " border-[var(--green)] bg-[var(--green)] text-[#10110f] enabled:hover:bg-[var(--lime)] enabled:active:bg-[var(--green-dark)] enabled:active:text-white"
        : " border-[#41463f] bg-[#151714] text-[var(--ink)] enabled:hover:bg-[var(--green-soft)] enabled:active:bg-[var(--green-dark)] enabled:active:text-white")}>
      {cargando ? "Preparando " : "Descargar "}{formato.toUpperCase()}
    </button>
  ));
}
