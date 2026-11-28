import { useId } from "react";

export const panelReporte = "min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6";
export const campoReporte = "min-h-11 w-full min-w-0 rounded-lg border border-[var(--line)] bg-[#151714] px-3 py-2 text-[var(--ink)] [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lime)] disabled:opacity-60";
export const filtrosReporte = "grid min-w-0 gap-3 sm:grid-cols-2";

export function FechasReporte({ desde, hasta, setDesde, setHasta, disabled }) {
  const id = useId();
  return (
    <fieldset className="mt-5 min-w-0" aria-describedby={id + "-ayuda"}>
      <legend className="font-semibold">Rango de fechas</legend>
      <p id={id + "-ayuda"} className="mb-3 text-sm text-[var(--muted)]">Fechas opcionales. Puedes dejar el rango abierto.</p>
      <div className={filtrosReporte}>
        <div className="grid min-w-0 gap-1 text-sm">
          <label htmlFor={id + "-desde"}>Fecha inicial</label>
          <input id={id + "-desde"} name="desde" type="date" value={desde} max={hasta || undefined}
            onChange={event => setDesde(event.target.value)} disabled={disabled} className={campoReporte} />
        </div>
        <div className="grid min-w-0 gap-1 text-sm">
          <label htmlFor={id + "-hasta"}>Fecha final</label>
          <input id={id + "-hasta"} name="hasta" type="date" value={hasta} min={desde || undefined}
            onChange={event => setHasta(event.target.value)} disabled={disabled} className={campoReporte} />
        </div>
      </div>
    </fieldset>
  );
}

export function EstadoDescarga({ resultado }) {
  return <>
    <p role="status" className="text-sm text-[var(--muted)]">
      {resultado?.estado === "cargando" ? "Preparando el archivo." :
        resultado?.estado !== "error" && resultado?.mensaje}
    </p>
    <p role="alert" className="text-sm text-[#ffabab]">
      {resultado?.estado === "error" && resultado.mensaje}
    </p>
  </>;
}

export function BotonesDescarga({ disabled, cargando }) {
  const base = "inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 font-semibold enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lime)] disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors";
  return <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">{["csv", "pdf"].map(formato => (
    <button key={formato} type="submit" value={formato} disabled={disabled || cargando}
      className={base + (formato === "pdf"
        ? " border-[var(--green)] bg-[var(--green)] text-[#10110f] enabled:hover:bg-[var(--lime)] enabled:active:bg-[var(--green-dark)] enabled:active:text-white"
        : " border-[#41463f] bg-[#151714] text-[var(--ink)] enabled:hover:bg-[var(--green-soft)] enabled:active:bg-[var(--green-dark)] enabled:active:text-white")}>
      {cargando ? "Preparando " : "Descargar "}{formato.toUpperCase()}
    </button>
  ))}</div>;
}
