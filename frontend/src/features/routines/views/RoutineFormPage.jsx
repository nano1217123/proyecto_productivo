"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import RoutineExercisePicker from "../components/RoutineExercisePicker";
import { RoutineExerciseEditor } from "../components/RoutineExercise";
import { useRoutineForm } from "../hooks/useRoutineForm";
import { routineStats, routineUrl, weekdays } from "../routineModel";
import "./routines.css";

const dayInitials = ["L", "M", "X", "J", "V", "S", "D"];

export default function RoutineFormPage({ gym = "jj-poblado", rutinaId = null, copia, entrenamiento }) {
  const { loading } = useAuth();
  const form = useRoutineForm(gym, rutinaId, copia, entrenamiento, !loading);
  const [replacing, setReplacing] = useState(null);
  const catalog = useRef(null);
  const title = rutinaId ? "Editar rutina" : copia ? "Duplicar rutina" : entrenamiento ? "Guardar sesión como rutina" : "Crear rutina";
  const back = routineUrl(gym, rutinaId || copia ? `/${rutinaId || copia}` : "");
  const { info, changeInfo, seleccionados } = form;
  const stats = routineStats(seleccionados);

  function startReplacement(item) {
    setReplacing(item);
    const panel = catalog.current;
    if (panel) {
      panel.open = true;
      panel.querySelector("input[type=search]")?.focus();
    }
  }

  return <main className="routine-page routine-form-page">
    <header className="routine-header routine-form-header">
      <Link href={back} aria-label="Volver a rutinas">←<span className="routine-visually-hidden">Volver a rutinas</span></Link>
      <h1>{title}</h1>
    </header>
    {(loading || form.cargandoDatos) ? <p role="status">Cargando formulario…</p>
      : form.loadError ? <p role="alert" className="routine-error">{form.loadError} <button type="button" onClick={form.retryLoad}>Reintentar</button></p>
      : <form onSubmit={form.guardarRutina} onInvalidCapture={(event) => {
        const details = event.target.closest("details");
        if (details) details.open = true;
      }}>
        <fieldset className="routine-stack" disabled={form.guardando}>
          <section className="routine-stack" aria-label="Información general">
            <label>Nombre de la rutina<input type="text" required maxLength={60} value={info.nombre} onChange={(event) => changeInfo("nombre", event.target.value)} /></label>
            <label>Descripción opcional<textarea rows={2} placeholder="Describe tu rutina…" maxLength={500} value={info.descripcion} onChange={(event) => changeInfo("descripcion", event.target.value)} /></label>
            <fieldset>
              <legend>Días asignados</legend>
              <div className="routine-days">{weekdays.map((day, index) => {
                const value = index + 1;
                return <label key={day} title={day}><input className="routine-visually-hidden" type="checkbox" aria-label={day} checked={info.dias.includes(value)} onChange={(event) => changeInfo("dias",
                  event.target.checked ? [...info.dias, value].sort((a, b) => a - b) : info.dias.filter((day) => day !== value))} />{dayInitials[index]}</label>;
              })}</div>
            </fieldset>
            <details className="routine-extra">
              <summary>Objetivo y notas generales</summary>
              <div className="routine-fields">
                <label>Objetivo<input type="text" maxLength={120} value={info.objetivo} onChange={(event) => changeInfo("objetivo", event.target.value)} /></label>
                <label>Notas generales<textarea maxLength={200} value={info.notas} onChange={(event) => changeInfo("notas", event.target.value)} /></label>
                {info.diaEtiqueta && <label>Etiqueta anterior<input maxLength={40} value={info.diaEtiqueta} onChange={(event) => changeInfo("diaEtiqueta", event.target.value)} /></label>}
              </div>
            </details>
          </section>
          <section aria-labelledby="routine-exercises-heading" className="routine-stack">
            <div className="routine-section-heading">
              <h2 id="routine-exercises-heading">Ejercicios</h2>
              <p aria-live="polite">{seleccionados.length} ejercicios · {stats.series} series
                {stats.minutes != null && <span title="Estimación basada en repeticiones o duración, descansos y transiciones"> · {stats.minutes} min aprox.</span>}
              </p>
            </div>
            <ol className="routine-stack">{seleccionados.map((item, index) => <RoutineExerciseEditor
              key={item.key} item={item} index={index} count={seleccionados.length}
              configure={form.configurarEjercicio} move={form.moverEjercicio} remove={(key) => {
                if (replacing?.key === key) setReplacing(null);
                form.quitarEjercicio(key);
              }} replace={startReplacement} />)}</ol>
            {!!stats.groups.length && <div className="routine-tags">{stats.groups.map((group) => <span key={group}>{group}</span>)}</div>}
            <details ref={catalog} className="routine-catalog-anchor routine-catalog-panel">
              <summary>+ Añadir ejercicios</summary>
              <RoutineExercisePicker catalogo={form.catalogo} selected={seleccionados} replacing={replacing}
                onAdd={(item) => {
                  form.agregarEjercicio(item, replacing?.key);
                  if (replacing && catalog.current) catalog.current.open = false;
                  setReplacing(null);
                }}
                onRemove={form.quitarEjercicio} onCancel={() => setReplacing(null)} />
            </details>
          </section>
        </fieldset>
        <div className="routine-save">
          {form.error && <p className="routine-error" role="alert">{form.error}</p>}
          <button className="routine-primary" disabled={form.guardando} type="submit">{form.guardando ? "Guardando…" : rutinaId ? "Guardar cambios" : "Guardar rutina"}</button>
          <Link href={back}>Descartar</Link>
        </div>
      </form>}
  </main>;
}
