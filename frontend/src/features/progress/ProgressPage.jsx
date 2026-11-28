"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { HomeIcon } from "@/src/features/dashboard/components/HomePanel";
import { goals, grams } from "@/src/features/nutrition/components/labels";
import { civilToday, minutes, timeLabel } from "@/src/features/training/hooks/historyDates";
import { useHistoryRequest } from "@/src/features/training/hooks/useHistoryRequest";
import { BodyDialog, WeightHistory, WeightOverview, weightDate, weightLabel } from "./BodyProgress";
import { ActivityChart, ExercisePerformance, PersonalRecords, RequestState } from "./SportProgress";
import { periods, progressApi, rangeFor } from "./progressApi";
import "./progress.css";

const views = { resumen: "Resumen", corporal: "Seguimiento corporal", rendimiento: "Rendimiento deportivo" };

function Indicator({ icon, label, value, detail, record = false }) {
  return <div className={`progress-kpi${record ? " progress-record-title" : ""}`}>
    <HomeIcon name={icon} /><span>{label}</span>
    <strong>{value}</strong><small>{detail}</small>
  </div>;
}

function NutritionSummary({ result, retry, url }) {
  return <section className="progress-panel progress-nutrition">
    <h2>Mi nutrición</h2>
    <RequestState {...{ result, retry }}>{({ configured, goal, tracking, reference, protein }) => <>
      {!configured && <p>Configura tu perfil para consultar tu objetivo nutricional.</p>}
      {configured && <p>{goals[goal]?.name ?? "Objetivo sin definir"}</p>}
      {configured && !tracking && <p>Seguimiento nutricional desactivado.</p>}
      {tracking && <>
        <p>{protein == null ? "Sin registros de proteína hoy." : <><strong>{grams(protein)}</strong> de proteína registrada hoy</>}</p>
        {reference ? <>
          <p className="progress-muted">Referencia diaria · {grams(reference.minimum)}–{grams(reference.maximum)}</p>
          {protein != null && <progress value={Math.min(protein, reference.minimum)} max={reference.minimum} aria-label="Proteína registrada respecto al límite inferior de la referencia" />}
        </> : <p className="progress-muted">Referencia diaria sin configurar.</p>}
      </>}
      <Link href={url("/nutricion")}>{configured ? "Consultar mi nutrición" : "Configurar nutrición"} →</Link>
    </>}</RequestState>
  </section>;
}

function ProgressContent({ profile, params }) {
  const view = Object.hasOwn(views, params.get("vista")) ? params.get("vista") : "resumen";
  const [period, setPeriod] = useState("30");
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(1);
  const [bodyVersion, refreshBody] = useState(0);
  const [heightVersion, refreshHeight] = useState(0);
  const [sportVersion, refreshSport] = useState(0);
  const [foodVersion, refreshFood] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const today = civilToday();
  const range = rangeFor(period, today);
  const scope = `${profile.idusuario}-${today}-${period}`;
  const weightFilter = range.desde ? { desde: range.desde } : {};
  const weight = useHistoryRequest(view !== "rendimiento" ? `${scope}-peso-${bodyVersion}` : null,
    (signal) => progressApi.weight(weightFilter, signal));
  const history = useHistoryRequest(view === "corporal" && (page !== 1 || sort !== "desc") ? `${scope}-historial-${bodyVersion}-${page}-${sort}` : null,
    (signal) => progressApi.weight({ ...weightFilter, pagina: page, orden: sort, grafica: "no" }, signal));
  const height = useHistoryRequest(view !== "rendimiento" ? `${profile.idusuario}-altura-${heightVersion}` : null, progressApi.height);
  const sportKey = `${scope}-deporte-${sportVersion}`;
  const sport = useHistoryRequest(view !== "corporal" ? sportKey : null, (signal) => progressApi.sport(range, signal));
  const nutrition = useHistoryRequest(view === "resumen" ? `${profile.idusuario}-nutricion-${today}-${bodyVersion}-${foodVersion}` : null, progressApi.nutrition);

  function url(path, values = {}) {
    const query = new URLSearchParams(values);
    const gym = profile.sede ?? params.get("gym");
    if (gym) query.set("gym", gym);
    if (profile.tipo_usuario === "usuario_particular" || params.get("modo") === "casa") query.set("modo", "casa");
    return `/dashboard${path}${query.size ? "?" + query : ""}`;
  }
  function save(kind) {
    setDialog(null);
    if (kind === "height") refreshHeight((value) => value + 1);
    else {
      setPage(1);
      refreshBody((value) => value + 1);
    }
    setNotice({ add: "Registro guardado.", edit: "Registro actualizado.", delete: "Registro eliminado.", height: "Altura del perfil actualizada." }[kind]);
  }
  const retryBody = () => refreshBody((value) => value + 1);
  const retrySport = () => refreshSport((value) => value + 1);
  const latest = weight.data?.ultimo;
  const weightValue = weight.error ? "Sin disponibilidad" : weight.data ? weightLabel(latest?.pesoActualKg) : "…";
  return <main className="progress-page">
    <header className="progress-header">
      <div><h1>Mi progreso</h1><p>Conoce tu evolución y consulta los resultados de tu entrenamiento.</p></div>
      <div className="progress-actions">
        <label>Periodo <select value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}>
          {Object.entries(periods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <button type="button" className="progress-primary" onClick={() => setDialog({ kind: "add" })}>+ Registrar peso</button>
      </div>
    </header>
    <nav aria-label="Vistas de Mi progreso" className="progress-tabs">
      {Object.entries(views).map(([key, label]) => <Link key={key} href={url("/particular", { vista: key })}
        scroll={false} aria-current={key === view ? "page" : undefined}>{label}</Link>)}
    </nav>
    {notice && <p className="progress-feedback" role="status">{notice}</p>}
    {view !== "rendimiento" && <div className="progress-kpis">
      <Indicator icon="scale" label="Peso corporal" value={weightValue} detail={latest ? weightDate(latest.fecha) : "Último registro"} />
      <Indicator icon="ruler" label="Altura" value={height.error ? "Sin disponibilidad" : height.data ? height.data.alturaCm == null ? "Sin registro" : `${height.data.alturaCm} cm` : "…"} detail="Perfil personal" />
      {view === "resumen" && <>
        <Indicator icon="training" label="Entrenamientos" value={sport.data?.actividad.sesiones ?? (sport.error ? "Sin disponibilidad" : "…")} detail={periods[period]} />
        <Indicator icon="time" label="Tiempo entrenado" value={sport.data ? sport.data.actividad.tiempo == null ? "Sin duración" : minutes(sport.data.actividad.tiempo) : sport.error ? "Sin disponibilidad" : "…"} detail={periods[period]} />
        {(sport.data?.records > 0 || sport.error) && <Indicator icon="trophy" label="Récords personales" value={sport.data?.records ?? "Sin disponibilidad"} detail={periods[period]} record />}
      </>}
    </div>}
    {view !== "rendimiento" && <div className="progress-grid">
      <RequestState result={weight} retry={retryBody}>{(data) => <WeightOverview data={data} />}</RequestState>
      <div className="progress-stack">
        <section className="progress-panel progress-latest">
          <h2>Último registro</h2>
          <strong>{weightValue}</strong>
          {latest && <p className="progress-muted">{weightDate(latest.fecha)} · {timeLabel(latest.fecha)}</p>}
          <RequestState result={height} retry={() => refreshHeight((value) => value + 1)}>{(data) =>
            <button type="button" onClick={() => setDialog({ kind: "height", height: data.alturaCm })}>{data.alturaCm == null ? "Completar altura del perfil" : "Actualizar altura del perfil"}</button>
          }</RequestState>
          {view === "resumen" && <Link href={url("/particular", { vista: "corporal" })} scroll={false}>Consultar historial de peso →</Link>}
        </section>
        {view === "resumen" && <NutritionSummary result={nutrition} retry={() => refreshFood((value) => value + 1)} url={url} />}
      </div>
    </div>}
    {view === "corporal" && <RequestState result={page === 1 && sort === "desc" ? weight : history} retry={retryBody}>
      {(data) => <WeightHistory data={data} page={page} sort={sort} onPage={setPage}
        onSort={(value) => { setSort(value); setPage(1); }} onAction={setDialog} />}
    </RequestState>}
    {view !== "corporal" && <RequestState result={sport} retry={retrySport}>{(data) => <>
      <div className="progress-grid">
        <ActivityChart data={data} range={range} compact={view === "resumen"} action={view === "resumen"
          ? <Link href={url("/particular", { vista: "rendimiento" })} scroll={false}>Explorar rendimiento →</Link>
          : <Link href={url("/entrenamientos/historial", range)}>Consultar sesiones →</Link>} />
        <PersonalRecords data={data} url={url} compact={view === "resumen"} />
      </div>
      {view === "rendimiento" && <ExercisePerformance exercises={data.ejercicios} range={range} requestKey={sportKey} />}
    </>}</RequestState>}
    {dialog && <BodyDialog dialog={dialog} close={() => setDialog(null)} saved={save} />}
  </main>;
}

export default function ProgressPage() {
  const { profile, loading } = useAuth();
  const params = useSearchParams();
  if (loading) return <main className="progress-page"><p role="status">Cargando Mi progreso…</p></main>;
  if (!["cliente", "usuario_particular"].includes(profile?.tipo_usuario)) return <main className="progress-page">
    <h1>Mi progreso</h1><p>Inicia sesión con una cuenta personal para consultar tus registros.</p>
  </main>;
  return <ProgressContent key={profile.idusuario} {...{ profile, params }} />;
}
