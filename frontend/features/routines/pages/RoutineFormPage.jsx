"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getExerciseCatalog } from "@/features/training/lib/training";
import { getRoutineDetail, createRoutine, updateRoutine } from "../lib/routines";

export default function RoutineFormPage({ gym = "jj-poblado", rutinaId = null }) {
  const { session, loading, logout } = useAuth();
  const router = useRouter();
  const esEdicion = Boolean(rutinaId);

  const [catalogo, setCatalogo] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [nombre, setNombre] = useState("");
  const [diaEtiqueta, setDiaEtiqueta] = useState("");
  const [seleccionados, setSeleccionados] = useState([]); // [{ ejercicio_id, nombre }]
  const [ejercicioAAgregar, setEjercicioAAgregar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const cat = await getExerciseCatalog();
        setCatalogo(cat);

        if (esEdicion) {
          const rutina = await getRoutineDetail(rutinaId);
          setNombre(rutina.nombre);
          setDiaEtiqueta(rutina.dia_etiqueta || "");
          setSeleccionados(rutina.ejercicios.map((e) => ({ ejercicio_id: e.ejercicio_id, nombre: e.nombre })));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setCargandoDatos(false);
      }
    }
    cargar();
  }, [rutinaId, esEdicion]);

  const nombrePorId = new Map();
  for (const grupo of catalogo) {
    for (const ej of grupo.ejercicios) nombrePorId.set(String(ej.id), ej.nombre);
  }

  function agregarEjercicio() {
    if (!ejercicioAAgregar) return;
    setSeleccionados((prev) => [...prev, { ejercicio_id: Number(ejercicioAAgregar), nombre: nombrePorId.get(ejercicioAAgregar) }]);
    setEjercicioAAgregar("");
  }

  function quitarEjercicio(idx) {
    setSeleccionados((prev) => prev.filter((_, i) => i !== idx));
  }

  function moverEjercicio(idx, direccion) {
    setSeleccionados((prev) => {
      const next = [...prev];
      const destino = idx + direccion;
      if (destino < 0 || destino >= next.length) return prev;
      [next[idx], next[destino]] = [next[destino], next[idx]];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (seleccionados.length === 0) {
      setError("Agrega al menos un ejercicio a la rutina.");
      return;
    }

    setGuardando(true);
    try {
      const ejercicioIds = seleccionados.map((s) => s.ejercicio_id);
      if (esEdicion) {
        await updateRoutine({ rutinaId, nombre, diaEtiqueta, ejercicioIds });
      } else {
        await createRoutine({ usuarioId: session.user.id, nombre, diaEtiqueta, ejercicioIds });
      }
      router.push(`/dashboard/rutinas?gym=${encodeURIComponent(gym)}`);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  if (loading || cargandoDatos) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#171817]">
        <p className="text-sm text-[#a9afa7]">Cargando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Link className="inline-flex items-center gap-2.5 text-[#f2f4ef] text-[17px] font-extrabold tracking-widest no-underline" href={`/dashboard/rutinas?gym=${encodeURIComponent(gym)}`}>
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-[#b56cff] text-white text-[10px] tracking-[-1px]">GYM</span>
          <span>{esEdicion ? "Editar rutina" : "Nueva rutina"}</span>
        </Link>
        <button className="py-[9px] border-0 border-b border-[#6f756b] bg-transparent text-[#a9afa7] text-[13px] cursor-pointer hover:border-[#b56cff] hover:text-[#f2f4ef]" type="button" onClick={logout}>
          Cerrar sesion
        </button>
      </header>

      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Link className="inline-block mb-8 text-[13px] font-bold text-[#a9afa7] no-underline hover:text-[#b56cff]" href={`/dashboard/rutinas?gym=${encodeURIComponent(gym)}`}>&larr; Rutinas</Link>
        <p className="m-0 mb-3 text-[11px] font-extrabold tracking-[2.7px] text-[#b56cff]">ENTRENAMIENTO</p>
        <h1 className="m-0 text-[clamp(34px,5vw,54px)] tracking-[-1.8px] leading-[1.05]">{esEdicion ? "Editar rutina" : "Nueva rutina"}</h1>
      </section>

      {error && <div className="w-full max-w-[1060px] mx-auto mb-4 p-[10px_12px] border border-[rgba(255,121,121,0.32)] rounded-lg bg-[#351b1b] text-[#ff7979] text-[13px]">{error}</div>}

      <section className="w-full max-w-[1060px] mx-auto pb-10">
        <form onSubmit={handleSubmit} className="p-[26px] border border-[#41433f] rounded-xl bg-[#212320]">
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

          <p className="text-xs font-bold text-[#c0c7bd] mb-2">Ejercicios de la rutina</p>
          <div className="flex gap-3 mb-4">
            <select
              value={ejercicioAAgregar}
              onChange={(e) => setEjercicioAAgregar(e.target.value)}
              className="flex-1 p-[10px_12px] bg-[#151714] border border-[#41463f] rounded-lg text-[#f2f4ef] text-sm outline-none focus:border-[#b56cff]"
            >
              <option value="">Selecciona un ejercicio para agregar</option>
              {catalogo.map((grupo) => (
                <optgroup key={grupo.slug} label={grupo.nombre}>
                  {grupo.ejercicios.map((ej) => (
                    <option key={ej.id} value={ej.id}>{ej.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={agregarEjercicio}
              className="px-4 py-2.5 border border-[#41463f] rounded-lg bg-transparent text-[#f2f4ef] text-[13px] font-bold cursor-pointer transition hover:border-[#b56cff] hover:text-[#d7adff]"
            >
              + Agregar
            </button>
          </div>

          <div className="grid gap-2 mb-6">
            {seleccionados.length === 0 && (
              <p className="text-sm text-[#a9afa7]">Todavía no agregas ningún ejercicio.</p>
            )}
            {seleccionados.map((ej, idx) => (
              <div key={`${ej.ejercicio_id}-${idx}`} className="flex items-center justify-between gap-3 p-3 border border-[#30332f] rounded-lg bg-[#171817]">
                <span className="text-[13.5px] text-[#f2f4ef]"><strong className="text-[#b56cff] mr-2">{idx + 1}.</strong>{ej.nombre}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => moverEjercicio(idx, -1)} disabled={idx === 0} className="px-2.5 py-1 border border-[#41463f] rounded-md text-[#a9afa7] text-xs cursor-pointer hover:border-[#b56cff] hover:text-[#d7adff] disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
                  <button type="button" onClick={() => moverEjercicio(idx, 1)} disabled={idx === seleccionados.length - 1} className="px-2.5 py-1 border border-[#41463f] rounded-md text-[#a9afa7] text-xs cursor-pointer hover:border-[#b56cff] hover:text-[#d7adff] disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
                  <button type="button" onClick={() => quitarEjercicio(idx)} className="px-2.5 py-1 border border-[rgba(255,121,121,.4)] rounded-md text-[#ff7979] text-xs cursor-pointer hover:bg-[#351b1b]">Quitar</button>
                </div>
              </div>
            ))}
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