"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { routinesApi } from "../api/routinesApi";
import { RoutineActions, RoutineFacts } from "../components/RoutineCard";
import { RoutineExerciseDetail } from "../components/RoutineExercise";
import { useRoutineActions } from "../hooks/useRoutineActions";
import { routineUrl } from "../routineModel";
import "./routines.css";

export default function RoutineDetailPage({ gym = "jj-poblado", rutinaId }) {
  const { loading } = useAuth();
  const router = useRouter();
  const [rutina, setRutina] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const actions = useRoutineActions((action) => {
    if (action === "delete") router.replace(routineUrl(gym));
    else setRutina((previous) => ({ ...previous, archivada: action === "archive" }));
  });

  useEffect(() => {
    if (loading) return;
    let current = true;
    setError("");
    routinesApi.getRoutineDetail(rutinaId).then((item) => { if (current) setRutina(item); })
      .catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [loading, rutinaId, retry]);

  return <main className="routine-page routine-stack">
    <Link href={routineUrl(gym)}>Volver a rutinas</Link>
    {error ? <p role="alert" className="routine-error">{error} <button type="button" onClick={() => setRetry(retry + 1)}>Reintentar</button></p>
      : !rutina ? <p role="status">Cargando rutina…</p> : <>
        <header className="routine-header">
          <div>
            {rutina.archivada && <p>Rutina archivada</p>}
            <h1>{rutina.nombre}</h1>
            {rutina.descripcion && <p>{rutina.descripcion}</p>}
          </div>
          <RoutineActions rutina={rutina} gym={gym} onChange={actions.change} busy={actions.busy} />
        </header>
        {actions.notice && <p role="status">{actions.notice}</p>}
        {actions.actionError && <p role="alert" className="routine-error">{actions.actionError}</p>}
        <section className="routine-card routine-panel">
          <RoutineFacts rutina={rutina} />
          {rutina.objetivo && <p><strong>Objetivo</strong> · {rutina.objetivo}</p>}
        </section>
        <section className="routine-stack">
          <h2>Ejercicios</h2>
          <ol className="routine-stack">{rutina.ejercicios.map((item) => <RoutineExerciseDetail key={item.orden} item={item} position={item.orden} />)}</ol>
        </section>
        {rutina.notas && <section className="routine-card routine-panel"><h2>Notas generales</h2><p>{rutina.notas}</p></section>}
      </>}
  </main>;
}
