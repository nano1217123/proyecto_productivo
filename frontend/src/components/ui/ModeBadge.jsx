/**
 * Etiqueta que indica si el usuario está viendo contenido de gimnasio o de casa.
 * @param {{ casa: boolean, className?: string }} props
 */
export default function ModeBadge({ casa, className = "" }) {
  const styles = casa
    ? "border-[rgba(181,108,255,.45)] bg-[rgba(181,108,255,.12)] text-[#d7adff]"
    : "border-[#41433f] bg-[#212320] text-[#f2f4ef]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-xs font-bold ${styles} ${className}`}
    >
      <span aria-hidden="true">{casa ? "🏠" : "🏋️"}</span>
      {casa ? "Modo Autónomo (Casa)" : "Modo Gimnasio"}
    </span>
  );
}
