"use client";

import Link from "next/link";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { exercisesApi } from "@/src/features/exercises/api/exercisesApi";
import ReportesPersonales from "../components/ReportesPersonales";
import { trainingApi } from "../api/trainingApi";
import { useHistoryRequest } from "../hooks/useHistoryRequest";
import "./training.css";

export default function TrainingProgressPage({ gym = "jj-poblado" }) {
  const { loading } = useAuth();
  const [id, setId] = useState("");
  const [metric, setMetric] = useState("peso_max");
  const [retry, setRetry] = useState(0);
  const catalog = useHistoryRequest(loading ? null : `catalog-${retry}`, () => exercisesApi.getExerciseCatalog());
  const progress = useHistoryRequest(id ? `${id}-${retry}` : null, () => trainingApi.getExerciseHistory(id));
  return <main className="training-page"><div className="training-shell">
    <Link href={`/dashboard/entrenamientos/historial?gym=${encodeURIComponent(gym)}`}>Volver al historial</Link>
    <h1>Progreso de entrenamiento</h1>
    <ReportesPersonales />
    <section className="training-card">
      <h2 id="vista-previa-progreso">Progreso por ejercicio</h2>
      <label>Ejercicio<select value={id} onChange={(event) => setId(event.target.value)}>
        <option value="">Selecciona un ejercicio</option>
        {catalog.data?.map((group) => <optgroup key={group.slug} label={group.nombre}>
          {group.ejercicios.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.nombre}</option>)}
        </optgroup>)}
      </select></label>
      {(catalog.error || progress.error) && <div role="alert">{catalog.error || progress.error} <button onClick={() => setRetry(retry + 1)}>Reintentar</button></div>}
      {id && !progress.error && !progress.data && <p role="status">Cargando progreso…</p>}
      {progress.data?.length === 0 && <p>Este ejercicio todavía no tiene registros de fuerza.</p>}
      {progress.data?.length > 0 && <>
        <label>Medida de fuerza<select value={metric} onChange={(event) => setMetric(event.target.value)}>
          <option value="peso_max">Peso máximo</option><option value="reps_max">Repeticiones máximas</option>
        </select></label>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer><LineChart data={progress.data}>
            <XAxis dataKey="fecha" stroke="#b8c6ba" /><YAxis stroke="#b8c6ba" unit={metric === "peso_max" ? " kg" : " reps"} />
            <Tooltip contentStyle={{ background: "#161b17", border: "1px solid #444641" }} />
            <Line dataKey={metric} name={metric === "peso_max" ? "Peso máximo" : "Repeticiones máximas"} stroke="#a8ea87" />
          </LineChart></ResponsiveContainer>
        </div>
      </>}
    </section>
  </div></main>;
}
