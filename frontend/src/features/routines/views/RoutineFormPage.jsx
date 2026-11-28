"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import RoutineExercisePicker from "../components/RoutineExercisePicker";
import { RoutineExerciseEditor } from "../components/RoutineExercise";
import { RoutineFacts } from "../components/RoutineCard";
import { useRoutineForm } from "../hooks/useRoutineForm";
import { routineUrl, weekdays } from "../routineModel";
import "./routines.css";

export default function RoutineFormPage({ gym = "jj-poblado", rutinaId = null, copia, entrenamiento }) {
  const { loading } = useAuth();
  const form = useRoutineForm(gym, rutinaId, copia, entrenamiento, !loading);
  const [replacing, setReplacing] = useState(null);
  const catalog = useRef(null);
  const title = rutinaId ? "Editar rutina" : copia ? "Duplicar rutina" : entrenamiento ? "Guardar sesión como rutina" : "Nueva rutina";
  const back = routineUrl(gym, rutinaId || copia ? `/${rutinaId || copia}` : "");
  const { info, changeInfo, seleccionados } = form;

  return <main className="routine-page">
    <Link href={back}>Volver a rutinas</Link>
    <header className="routine-header"><h1>{title}</h1></header>
    {(loading || form.cargandoDatos) ? <p role="status">Cargando formulario…</p>
      : form.loadError ? <p role="alert" className="routine-error">{form.loadError} <button type="button" onClick={form.retryLoad}>Reintentar</button></p>
      : <form onSubmit={form.guardarRutina} onInvalidCapture={(event) => {
        const details = event.target.closest("details");
        if (details) details.open = true;
      }}>
        <fieldset className="routine-stack" disabled={form.guardando}>
          <section className="routine-card routine-panel routine-stack">
            <h2>Información general</h2>
            <div className="routine-fields">
              <label>Nombre de la rutina<input type="text" required maxLength={60} value={info.nombre} onChange={(event) => changeInfo("nombre", event.target.value)} /></label>
              <label>Objetivo<input type="text" maxLength={120} value={info.objetivo} onChange={(event) => changeInfo("objetivo", event.target.value)} /></label>
              <label>Descripción<textarea maxLength={500} value={info.descripcion} onChange={(event) => changeInfo("descripcion", event.target.value)} /></label>
              <label>Notas generales<textarea maxLength={200} value={info.notas} onChange={(event) => changeInfo("notas", event.target.value)} /></label>
              {info.diaEtiqueta && <label>Etiqueta anterior<input maxLength={40} value={info.diaEtiqueta} onChange={(event) => changeInfo("diaEtiqueta", event.target.value)} /></label>}
            </div>
            <fieldset>
              <legend>Días de la semana</legend>
              <div className="routine-days">{weekdays.map((day, index) => {
                const value = index + 1;
                return <label key={day}><input type="checkbox" checked={info.dias.includes(value)} onChange={(event) => changeInfo("dias",
                  event.target.checked ? [...info.dias, value].sort((a, b) => a - b) : info.dias.filter((day) => day !== value))} /> {day}</label>;
              })}</div>
            </fieldset>
          </section>
          <div className="routine-workspace routine-stack">
            <div ref={catalog} tabIndex={-1} className="routine-catalog-anchor">
              <RoutineExercisePicker catalogo={form.catalogo} selected={seleccionados} replacing={replacing}
                onAdd={(item) => { form.agregarEjercicio(item, replacing?.key); setReplacing(null); }}
                onRemove={form.quitarEjercicio} onCancel={() => setReplacing(null)} />
            </div>
            <section aria-label="Ejercicios seleccionados" className="routine-stack">
              <h2>Orden y configuración</h2>
              {entrenamiento && <button type="button" onClick={form.quitarCargasImportadas}>Descartar pesos importados</button>}
              {!seleccionados.length && <p className="routine-muted">Agrega ejercicios del catálogo para configurar el plan.</p>}
              <ol className="routine-stack">{seleccionados.map((item, index) => <RoutineExerciseEditor
                key={item.key} item={item} index={index} count={seleccionados.length}
                configure={form.configurarEjercicio} move={form.moverEjercicio} remove={(key) => {
                  if (replacing?.key === key) setReplacing(null);
                  form.quitarEjercicio(key);
                }} replace={(entry) => {
                  setReplacing(entry);
                  catalog.current?.focus();
                  catalog.current?.scrollIntoView({ block: "start" });
                }} />)}</ol>
            </section>
          </div>
          <section className="routine-card routine-panel" aria-live="polite">
            <h2>Resumen de la rutina</h2>
            <RoutineFacts rutina={{ ejercicios: seleccionados, dias: info.dias }} />
            <p className="routine-muted">Para estimar la duración se usan 3 segundos por repetición, los descansos entre series y 30 segundos entre ejercicios.</p>
          </section>
        </fieldset>
        <div className="routine-save">
          {form.error && <p className="routine-error" role="alert">{form.error}</p>}
          <Link href={back}>Descartar</Link>
          <button className="routine-primary" disabled={form.guardando} type="submit">{form.guardando ? "Guardando…" : rutinaId ? "Guardar cambios" : "Crear rutina"}</button>
        </div>
      </form>}
  </main>;
}
