"use client";

import RoutineExercisePicker from "../components/RoutineExercisePicker";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useRoutineForm } from "../hooks/useRoutineForm";

const orderButtonClass = "min-h-10 px-2.5 py-1 border border-[#41463f] rounded-md text-[#a9afa7] text-xs cursor-pointer hover:border-[#b56cff] hover:text-[#d7adff] focus-visible:outline-2 focus-visible:outline-[#b56cff] disabled:opacity-40 disabled:cursor-not-allowed";

export default function RoutineFormPage({ gym = "jj-poblado", rutinaId = null }) {
  const { loading } = useAuth();
  const {
    esEdicion, catalogo, cargandoDatos,
    nombre, setNombre,
    diaEtiqueta, setDiaEtiqueta,
    seleccionados,
    guardando, error,
    agregarEjercicio, quitarEjercicio, moverEjercicio,
    guardarRutina
  } = useRoutineForm(gym, rutinaId);
  if (loading || cargandoDatos) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
        <p className="text-sm text-[#a9afa7]">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-[72px] sm:px-6 bg-[#171817]">

      <section className="w-full max-w-[1060px] mx-auto pt-8 pb-6">
        <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">{esEdicion ? "Editar rutina" : "Nueva rutina"}</h1>
      </section>

      {error && <div role="alert" className="w-full max-w-[1060px] mx-auto mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{error}</div>}

      <section className="w-full max-w-[1060px] mx-auto pb-10">
        <form onSubmit={guardarRutina} className="p-4 sm:p-6 border border-[#41433f] rounded-xl bg-[#212320]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[15px] mb-6">
            <label className="text-xs font-bold text-[#c0c7bd]">
              Nombre de la rutina
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Día 1 — Empuje"
                maxLength={60}
                required
                className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
              />
            </label>
            <label className="text-xs font-bold text-[#c0c7bd]">
              Día / etiqueta (opcional)
              <input
                type="text"
                value={diaEtiqueta}
                onChange={(e) => setDiaEtiqueta(e.target.value)}
                placeholder="Ej: Lunes"
                maxLength={30}
                className="w-full mt-2 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
              />
            </label>
          </div>

          <div className="mb-6 grid items-start gap-5 lg:grid-cols-2">
            <RoutineExercisePicker catalogo={catalogo} agregarEjercicio={agregarEjercicio} />

            <section aria-labelledby="ejercicios-rutina" className="min-w-0 rounded-xl border border-[#41433f] bg-[#171817] p-4">
              <h2 id="ejercicios-rutina" className="mb-3 text-base font-bold text-[#f2f4ef]">
                Ejercicios de la rutina ({seleccionados.length})
              </h2>
              {seleccionados.length === 0 && (
                <p className="text-sm text-[#a9afa7]">Todavía no has agregado ningún ejercicio.</p>
              )}
              <ol className="grid gap-2">
                {seleccionados.map((ej, idx) => (
                  <li key={`${ej.ejercicio_id}-${idx}`} className="grid gap-2 rounded-lg border border-[#30332f] bg-[#212320] p-3">
                    <p className="break-words text-sm text-[#f2f4ef]">
                      <strong className="mr-2 text-[#b56cff]">{idx + 1}.</strong>{ej.nombre}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => moverEjercicio(idx, -1)} disabled={idx === 0} aria-label={`Subir ${ej.nombre}, ejercicio ${idx + 1}`} className={orderButtonClass}>Subir</button>
                      <button type="button" onClick={() => moverEjercicio(idx, 1)} disabled={idx === seleccionados.length - 1} aria-label={`Bajar ${ej.nombre}, ejercicio ${idx + 1}`} className={orderButtonClass}>Bajar</button>
                      <button type="button" onClick={() => quitarEjercicio(idx)} aria-label={`Quitar ${ej.nombre}, ejercicio ${idx + 1}`} className={`${orderButtonClass} border-[rgba(255,121,121,.4)] text-[#ff7979] hover:bg-[#351b1b]`}>Quitar</button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full p-3 border-0 rounded-[10px] bg-[#b56cff] text-[#10110f] text-sm font-extrabold cursor-pointer shadow-[0_10px_20px_rgba(181,108,255,0.15)] transition hover:bg-[#d7adff] hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear rutina"}
          </button>
        </form>
      </section>
    </main>
  );
}