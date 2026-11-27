import { useState } from "react";

const PAGE_SIZE = 6;
const fieldClass = "w-full min-w-0 p-2.5 bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm focus-visible:outline-2 focus-visible:outline-[#b56cff]";
const buttonClass = "min-h-10 px-3 py-2 border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm font-bold cursor-pointer hover:border-[#b56cff] hover:text-[#d7adff] focus-visible:outline-2 focus-visible:outline-[#b56cff] disabled:opacity-50 disabled:cursor-not-allowed";

function normalizeSearch(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function RoutineExercisePicker({ catalogo, agregarEjercicio }) {
  const [grupoActivo, setGrupoActivo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [aviso, setAviso] = useState("");
  const palabras = normalizeSearch(busqueda).trim().split(/\s+/).filter(Boolean);
  const resultados = catalogo
    .filter((grupo) => !grupoActivo || grupo.slug === grupoActivo)
    .flatMap((grupo) => grupo.ejercicios
      .filter((ejercicio) => {
        const texto = normalizeSearch(`${ejercicio.nombre} ${grupo.nombre}`);
        return palabras.every((palabra) => texto.includes(palabra));
      })
      .map((ejercicio) => ({ ejercicio, grupo })));
  const inicio = pagina * PAGE_SIZE;
  const fin = Math.min(inicio + PAGE_SIZE, resultados.length);

  function agregar(ejercicio) {
    agregarEjercicio(ejercicio);
    setAviso(`Se agregó ${ejercicio.nombre} a la rutina.`);
  }

  return (
    <section aria-labelledby="catalogo-rutina" className="min-w-0">
      <h2 id="catalogo-rutina" className="mb-3 text-base font-bold text-[#f2f4ef]">Buscar ejercicios</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm text-[#c0c7bd]">
          Nombre o músculo
          <input
            type="search"
            value={busqueda}
            placeholder="Ej. press, bíceps"
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPagina(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
            }}
            className={fieldClass}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm text-[#c0c7bd]">
          Grupo muscular
          <select
            value={grupoActivo}
            onChange={(event) => {
              setGrupoActivo(event.target.value);
              setPagina(0);
            }}
            className={fieldClass}
          >
            <option value="">Todos los grupos</option>
            {catalogo.map((grupo) => (
              <option key={grupo.slug} value={grupo.slug}>{grupo.nombre}</option>
            ))}
          </select>
        </label>
      </div>

      <p role="status" className="my-3 text-sm text-[#a9afa7]">
        {resultados.length > 0
          ? `Mostrando ${inicio + 1}–${fin} de ${resultados.length}`
          : "No hay ejercicios para mostrar."}
      </p>
      <ul className="grid gap-2">
        {resultados.slice(inicio, fin).map(({ ejercicio, grupo }) => (
          <li key={`${grupo.slug}-${ejercicio.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#30332f] bg-[#171817] p-3">
            <div className="min-w-0 break-words">
              <p className="text-sm font-bold text-[#f2f4ef]">{ejercicio.nombre}</p>
              <p className="text-xs text-[#a9afa7]">{grupo.nombre}</p>
            </div>
            <button type="button" onClick={() => agregar(ejercicio)} aria-label={`Agregar ${ejercicio.nombre}`} className={buttonClass}>
              Agregar
            </button>
          </li>
        ))}
      </ul>
      {resultados.length > PAGE_SIZE && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setPagina(pagina - 1)} disabled={pagina === 0} className={buttonClass}>Anterior</button>
          <button type="button" onClick={() => setPagina(pagina + 1)} disabled={fin === resultados.length} className={buttonClass}>Siguiente</button>
        </div>
      )}
      <p role="status" className="mt-3 text-sm text-[#d7adff]">{aviso}</p>
    </section>
  );
}
