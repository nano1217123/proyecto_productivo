"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { exercisesApi } from "@/src/features/exercises/api/exercisesApi";
import { routinesApi } from "@/src/features/routines/api/routinesApi";
import { historyApi } from "../api/historyApi";
import { useHistoryRequest } from "../hooks/useHistoryRequest";
import { trainingApi } from "../api/trainingApi";
import ActiveTraining from "../components/ActiveTraining";
import { useActiveTraining } from "../hooks/useActiveTraining";
import { duration, formatTime, measureLabel, repeatContent, sessionStats } from "../hooks/trainingSessionModel";
import "./training.css";

function TrainingSummary({ session, catalog, onRepeat, onBack, historyUrl }) {
  const { sesion: content } = session;
  const stats = sessionStats(content);
  const names = new Map(catalog.flatMap((group) => group.ejercicios.map((item) => [item.id, item.nombre])));
  const historical = useHistoryRequest(session.id, (signal) => historyApi.detail(session.id, signal));
  const records = historical.data?.mejoras ?? [];

  return <section className="training-card">
    <p className="training-eyebrow" role="status">Entrenamiento guardado</p>
    <h1>{content.nombre}</h1>
    <p>{new Date(session.finalizadoEn).toLocaleString("es-CO")}</p>
    <div className="training-metrics">
      <div><strong>{formatTime(duration(session))}</strong><small>Duración</small></div>
      <div><strong>{stats.exercises}</strong><small>Ejercicios</small></div>
      <div><strong>{stats.done}</strong><small>Series completadas</small></div>
      {stats.volume > 0 && <div><strong>{stats.volume.toLocaleString("es-CO")}</strong><small>Volumen (kg × reps)</small></div>}
    </div>
    {content.notas && <p>{content.notas}</p>}
    {!!records.length && <div><h2>Récords personales</h2><ul>
      {records.map((item) => <li key={`${item.ejercicio_id}:${item.tipo}`}>{names.get(item.ejercicio_id) || `Ejercicio ${item.ejercicio_id}`}: {item.peso} kg</li>)}
    </ul></div>}
    <h2>Detalles de la sesión</h2>
    {content.ejercicios.map((item, index) => <div key={index} className="training-summary-exercise">
      <strong>{names.get(item.ejercicio_id) || `Ejercicio ${item.ejercicio_id}`}</strong>
      {item.notas && <p>{item.notas}</p>}
      <ol>{item.series.map((set, i) => <li key={i}>{measureLabel(set)}</li>)}</ol>
    </div>)}
    <div className="training-actions">
      <button type="button" className="training-primary" onClick={onBack}>Volver al panel</button>
      <button type="button" onClick={() => onRepeat(repeatContent(session))}>Repetir</button>
      <Link href={`/dashboard/rutinas/nueva?${historyUrl.split("?")[1]}&entrenamiento=${session.id}`}>Guardar como rutina</Link>
      <Link href={historyUrl}>Ver historial</Link>
    </div>
  </section>;
}

function TrainingDashboard({ gym, userId, refreshProfile }) {
  const params = useSearchParams();
  const active = useActiveTraining(userId, refreshProfile);
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [history, setHistory] = useState(null);
  const [routines, setRoutines] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [routineError, setRoutineError] = useState("");
  const [starting, setStarting] = useState(false);
  const startRequest = useRef(null);
  const startingRef = useRef(false);
  const autoStart = useRef(null);
  const [continueDraft, setContinueDraft] = useState(() => params.get("continuar") === "1" || params.get("libre") === "1");
  const [routineId, setRoutineId] = useState(params.get("rutina") || "");
  const repeatId = params.get("repetir");
  const query = `gym=${encodeURIComponent(gym)}`;
  const historyUrl = `/dashboard/entrenamientos/historial?${query}`;

  const loadCatalog = useCallback(() => exercisesApi.getExerciseCatalog().then((groups) => {
    setCatalog(groups);
    setCatalogError("");
  }).catch((error) => setCatalogError(error.message)), []);
  const loadHistory = useCallback(() => trainingApi.getTrainingHistory().then((sessions) => {
    setHistory(sessions);
    setHistoryError("");
  }).catch((error) => setHistoryError(error.message)), []);
  const loadRoutines = useCallback(() => routinesApi.getRoutines().then((items) => {
    setRoutines(items);
    setRoutineError("");
  }).catch((error) => setRoutineError(error.message)), []);

  useEffect(() => { void loadCatalog(); void loadHistory(); void loadRoutines(); }, [loadCatalog, loadHistory, loadRoutines]);
  useEffect(() => { if (active.summary) void loadHistory(); }, [active.summary, loadHistory]);

  function start(content) {
    active.start(content);
    setContinueDraft(true);
  }

  async function startRoutine() {
    if (!routineId || startingRef.current || active.draft) return;
    startingRef.current = true;
    setRoutineError("");
    setStarting(true);
    if (startRequest.current?.routineId !== routineId) {
      startRequest.current = { routineId, id: crypto.randomUUID() };
    }
    try {
      const { sesion } = await routinesApi.startRoutine(routineId, startRequest.current.id);
      if (sesion.estado !== "en_curso") {
        startRequest.current = null;
        throw new Error("La sesión ya se cerró. Pulsa iniciar para crear otra.");
      }
      await active.recoverServer();
      startRequest.current = null;
      setContinueDraft(true);
    } catch (error) {
      if (error.status === 409) await active.recoverServer();
      setRoutineError(error.message);
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  useEffect(() => {
    if (params.get("libre") === "1" && !params.get("rutina") && active.ready && !active.error && !autoStart.current) {
      autoStart.current = "libre";
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("libre");
      window.history.replaceState(null, "", currentUrl);
      if (!active.draft) start({ nombre: "Entrenamiento libre", notas: "", ejercicios: [] });
      return;
    }
    const requested = params.get("rutina");
    if (!requested || !active.ready || autoStart.current === requested) return;
    if (routineId !== requested) {
      setRoutineId(requested);
      return;
    }
    autoStart.current = requested;
    if (!active.draft) void startRoutine();
  }, [params, active.ready, active.error, active.draft, routineId, startRoutine, start]);

  const bogotaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(new Date());
  const weekStart = new Date(`${bogotaDate}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekly = history?.filter((item) => item.fecha >= weekStart.toISOString().slice(0, 10) && item.fecha <= bogotaDate) || [];
  const times = weekly.map(duration).filter((value) => value !== null);
  const weeklyDuration = times.reduce((total, value) => total + value, 0);
  const repeat = repeatId ? history?.find((item) => item.id === repeatId) : history?.[0];
  const records = new Map();
  for (const session of history || []) {
    for (const set of session.series_entrenamiento) {
      const type = set.tipo ?? "fuerza";
      if (!["fuerza", "carga_adicional"].includes(type) || set.peso_kg == null) continue;
      const key = `${set.ejercicio_id}:${type}`;
      const current = records.get(key);
      const record = !current || set.peso_kg > current.weight
        ? { name: set.ejercicios.nombre, weight: set.peso_kg, type, comparisons: current?.comparisons ?? 0 }
        : current;
      record.comparisons += 1;
      records.set(key, record);
    }
  }
  const personalRecords = [...records.values()].filter((item) => item.comparisons > 1).slice(0, 4);
  const syncError = active.error && <div className="training-card training-error" role="alert">
    <p>{active.error}</p>
    <div className="training-actions">
      <button type="button" onClick={active.sync}>Reintentar sincronización</button>
      {active.status === "Conflicto de sincronización" && <button type="button" onClick={() => {
        if (window.confirm("¿Descartar los cambios locales y cargar la sesión del servidor?")) void active.recoverServer();
      }}>Cargar sesión del servidor</button>}
    </div>
  </div>;

  const showingWorkout = active.ready && !active.summary && active.draft && continueDraft;

  return <main className="training-page">
    <div className="training-shell">
      {!showingWorkout && <nav className="training-top" aria-label="Entrenamientos">
        <Link href={`/dashboard/entrenamientos?${query}`} onClick={() => setContinueDraft(false)}>Entrenamientos</Link>
        <Link href={historyUrl}>Historial de entrenamientos</Link>
      </nav>}
      {active.draft && !showingWorkout && <p className="training-sync" role="status">{active.status}</p>}
      {active.storageError && <p className="training-error" role="alert">El navegador impide guardar una copia local. Mantén esta pantalla abierta hasta sincronizar.</p>}
      {syncError}
      {!active.ready && !active.error && <p role="status">Buscando entrenamientos pendientes…</p>}
      {active.summary && <TrainingSummary session={active.summary} catalog={catalog}
        onRepeat={start} onBack={() => { active.dismissSummary(); setContinueDraft(false); }} historyUrl={historyUrl} />}
      {active.ready && !active.summary && (active.draft && continueDraft ? (
        <ActiveTraining key={active.draft.id} draft={active.draft} edit={active.edit} close={active.close}
          status={active.status} onBack={() => setContinueDraft(false)}
          catalog={catalog} catalogError={catalogError} retryCatalog={loadCatalog} history={history || []} />
      ) : (
        <>
          <header className="training-hero">
            <h1>Registro de entrenamiento</h1>
            <p>Registra tus series mientras entrenas.</p>
            {active.draft
              ? <div>
                <p role="status">Tienes un entrenamiento en curso. Continúalo para finalizarlo o cancelarlo.</p>
                <button type="button" className="training-primary" onClick={() => setContinueDraft(true)}>Continuar {active.draft.contenido.nombre || "entrenamiento"}</button>
              </div>
              : <button type="button" className="training-primary" disabled={starting}
                onClick={() => start({ nombre: "Entrenamiento libre", notas: "", ejercicios: [] })}>+ Iniciar entrenamiento libre</button>}
          </header>
          <section className="training-card">
            <h2>Esta semana</h2>
            {historyError && <p role="alert">{historyError} <button type="button" onClick={loadHistory}>Reintentar historial</button></p>}
            {history === null && !historyError && <p role="status">Cargando actividad…</p>}
            {history?.length === 0 && <p className="training-muted">Tu historial comienza con la primera sesión. Inicia un entrenamiento y registra tus series.</p>}
            {!!history?.length && <div className="training-metrics">
              <div><strong>{weekly.length}</strong><small>Entrenamientos</small></div>
              <div><strong>{times.length ? formatTime(weeklyDuration) : "—"}</strong><small>Tiempo registrado</small></div>
              <div><strong>{times.length ? formatTime(Math.floor(weeklyDuration / times.length)) : "—"}</strong><small>Duración promedio</small></div>
              <div><strong>{history[0].fecha}</strong><small>Último entrenamiento</small></div>
            </div>}
            {!!personalRecords.length && <details><summary>Récords personales</summary><ul>
              {personalRecords.map((item, index) => <li key={index}>
                {item.name} · {item.weight} kg{item.type === "carga_adicional" && " adicionales"}
              </li>)}
            </ul></details>}
          </section>
          {!active.draft && <section className="training-card">
            <h2>Iniciar desde una plantilla</h2>
            {routineError && <p role="alert">{routineError} <button type="button" onClick={loadRoutines}>Recargar rutinas</button></p>}
            {routines === null && !routineError && <p role="status">Cargando rutinas…</p>}
            {routines?.length === 0 && <Link href={`/dashboard/rutinas/nueva?${query}`}>Crear una rutina</Link>}
            {!!routines?.length && <div className="training-actions">
              <label>Mis rutinas<select value={routineId} onChange={(event) => setRoutineId(event.target.value)}>
                <option value="">Elige una rutina</option>
                {routines.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </select></label>
              <button type="button" disabled={starting || !routines.some((item) => item.id === routineId)}
                onClick={startRoutine}>{starting ? "Cargando rutina…" : "Iniciar rutina"}</button>
            </div>}
            {repeat && <button type="button" disabled={starting} onClick={() => start(repeatContent(repeat))}>
              Repetir {repeat.nombre || `sesión del ${repeat.fecha}`}
            </button>}
          </section>}
        </>
      ))}
    </div>
  </main>;
}

function TrainingPageContent({ gym }) {
  const { user, loading, refreshProfile } = useAuth();
  if (loading) return <p className="training-page" role="status">Cargando sesión…</p>;
  if (!user?.idusuario) return <p className="training-page">Inicia sesión para entrenar.</p>;
  return <TrainingDashboard key={user.idusuario} gym={gym} userId={user.idusuario} refreshProfile={refreshProfile} />;
}

export default function TrainingPage({ gym = "jj-poblado" }) {
  return <Suspense fallback={<p className="training-page" role="status">Cargando entrenamiento…</p>}>
    <TrainingPageContent gym={gym} />
  </Suspense>;
}
