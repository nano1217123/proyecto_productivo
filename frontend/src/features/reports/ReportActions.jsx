export const enlaceReporte = "inline-flex w-fit items-center gap-2 rounded-lg border border-[#41463f] px-4 py-2 text-[var(--ink)] hover:bg-[var(--green-soft)] active:bg-[var(--green-dark)] active:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lime)] motion-safe:transition-colors";

export function IconoReporte({ tipo }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {tipo === "vista" ? <>
        <path d="M3 3v18h18M7 15l4-5 4 2 5-6" />
      </> : <>
        <path d="M6 3h8l4 4v14H6zM14 3v5h4" />
        {tipo === "csv" ? <path d="M8 12h8m-8 4h8m-4-4v4" /> : <path d="M12 11v6m-3-3 3 3 3-3" />}
      </>}
    </svg>
  );
}

export function BotonesDescarga({ disabled, cargando }) {
  const base = "inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold enabled:cursor-pointer enabled:shadow-sm enabled:active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lime)] disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-[background-color,box-shadow,transform] motion-safe:enabled:active:translate-y-px";
  return ["csv", "pdf"].map(formato => (
    <button key={formato} type="submit" value={formato} disabled={disabled || cargando}
      className={base + (formato === "pdf"
        ? " border-[var(--green)] bg-[var(--green)] text-[#10110f] enabled:hover:bg-[var(--lime)] enabled:active:bg-[var(--green-dark)] enabled:active:text-white"
        : " border-[#41463f] bg-[#151714] text-[var(--ink)] enabled:hover:bg-[var(--green-soft)] enabled:active:bg-[var(--green-dark)] enabled:active:text-white")}>
      <IconoReporte tipo={formato} />
      {cargando ? "Preparando " : "Descargar "}{formato.toUpperCase()}
    </button>
  ));
}
