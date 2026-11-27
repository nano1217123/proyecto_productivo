import { useState } from "react";

const fieldClass = "w-full min-w-0 rounded-lg border border-[#41463f] bg-[#151714] p-2.5 text-sm text-[#f2f4ef] focus-visible:outline-2 focus-visible:outline-[#b56cff]";

function normalize(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function TrainingExercisePicker({ catalogo, onAdd }) {
  const [busqueda, setBusqueda] = useState("");
  const [grupo, setGrupo] = useState("");
  const [ejercicioId, setEjercicioId] = useState("");
  const palabras = normalize(busqueda).trim().split(/\s+/).filter(Boolean);
  const resultados = catalogo
    .filter((item) => !grupo || grupo === item.slug)
    .map((item) => ({
      ...item,
      ejercicios: item.ejercicios.filter((ejercicio) => {
        const texto = normalize(`${ejercicio.nombre} ${item.nombre}`);
        return palabras.every((palabra) => texto.includes(palabra));
      }),
    }))
    .filter((item) => item.ejercicios.length > 0);

  return (
    <section aria-labelledby="elegir-ejercicio" className="mb-6 rounded-lg border border-[#41463f] bg-[#171817] p-4">
      <h2 id="elegir-ejercicio" className="mb-3 text-base font-bold text-[#f2f4ef]">Agregar ejercicio</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-sm text-[#c0c7bd]">
          Buscar por nombre o músculo
          <input type="search" value={busqueda} placeholder="Ej. press, bíceps"
            onChange={(event) => {
              setBusqueda(event.target.value);
              setEjercicioId("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
            }}
            className={fieldClass}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm text-[#c0c7bd]">
          Grupo muscular
          <select value={grupo} onChange={(event) => {
            setGrupo(event.target.value);
            setEjercicioId("");
          }} className={fieldClass}>
            <option value="">Todos los grupos</option>
            {catalogo.map((item) => <option key={item.slug} value={item.slug}>{item.nombre}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm text-[#c0c7bd]">
          Ejercicio
          <select value={ejercicioId} onChange={(event) => setEjercicioId(event.target.value)} disabled={resultados.length === 0} className={fieldClass}>
            <option value="">{resultados.length ? "Selecciona un ejercicio" : "No hay ejercicios disponibles"}</option>
            {resultados.map((item) => (
              <optgroup key={item.slug} label={item.nombre}>
                {item.ejercicios.map((ejercicio) => <option key={ejercicio.id} value={ejercicio.id}>{ejercicio.nombre}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <button type="button" disabled={!ejercicioId} onClick={() => {
          onAdd(ejercicioId);
          setEjercicioId("");
        }} className="min-h-10 self-end justify-self-start rounded-lg border border-[#41463f] px-4 py-2 text-sm font-bold text-[#f2f4ef] hover:border-[#b56cff] focus-visible:outline-2 focus-visible:outline-[#b56cff] disabled:cursor-not-allowed disabled:opacity-50">
          Agregar ejercicio
        </button>
      </div>
      <p role="status" className="mt-2 text-sm text-[#a9afa7]">
        {resultados.length === 0 ? "No se encontraron ejercicios con estos filtros." : ""}
      </p>
    </section>
  );
}
