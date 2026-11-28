"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { historyApi } from "../api/historyApi";
import HistoryCalendar from "../components/HistoryCalendar";
import HistoryComparison from "../components/HistoryComparison";
import HistoryDetail from "../components/HistoryDetail";
import HistoryEditor from "../components/HistoryEditor";
import HistoryList from "../components/HistoryList";
import { civilToday, fullDate, minutes, monthRange, weekStart } from "../hooks/historyDates";
import { useHistoryRequest } from "../hooks/useHistoryRequest";
import "./history.css";

const fields = [
  ["desde", "Desde", "date"], ["hasta", "Hasta", "date"], ["rutina", "Rutina de origen", "text"],
  ["grupo", "Grupo muscular", "text"], ["ejercicio", "Ejercicio", "text"], ["duracion", "Duración mínima (min)", "number"],
];

function ErrorState({ message, onRetry }) {
  return <div className="history-error" role="alert"><p>{message}</p><button onClick={onRetry}>Reintentar</button></div>;
}

export default function TrainingHistoryPage({ gym = "jj-poblado", initialRange = {}, initialSession = "" }) {
  const { loading } = useAuth();
  const router = useRouter();
  const [today] = useState(civilToday);
  const [view, setView] = useState("list");
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState("");
  const [filters, setFilters] = useState(() => initialRange);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [modal, setModal] = useState(() => initialSession ? { kind: "detail", id: initialSession } : null);
  const [reference, setReference] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const action = useRef(false);
  const repeatRequest = useRef(null);
  const dirty = useRef(false);
  const registerChanges = useCallback((value) => { dirty.current = value; }, []);
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const query = `gym=${encodeURIComponent(gym)}`;
  const training = `/dashboard/entrenamientos?${query}`;
  const routines = `/dashboard/rutinas?${query}`;
  const dates = { semana: weekStart(today), mes: monthRange(today).desde, hoy: today, ...monthRange(month) };
  const activity = useHistoryRequest(loading ? null : JSON.stringify([dates, refresh]), (signal) => historyApi.activity(dates, signal));
  const listParams = view === "list" ? { ...filters, pagina: page } : { pagina: page, desde: selected, hasta: selected };
  const list = useHistoryRequest(loading || (view === "calendar" && !selected) ? null : JSON.stringify([listParams, refresh]),
    (signal) => historyApi.list(listParams, signal));
  const detail = useHistoryRequest(modal?.id ? `${modal.id}:${refresh}` : null, (signal) => historyApi.detail(modal.id, signal));
  const comparison = useHistoryRequest(modal?.other ? `${reference.id}:${modal.other}:${refresh}` : null,
    (signal) => historyApi.compare(reference.id, modal.other, signal));
  const modalOpen = !!modal;

  useEffect(() => {
    if (modalOpen && !dialog.current.open) {
      dialog.current.showModal();
      closeButton.current?.focus();
    }
    else if (!modalOpen && dialog.current.open) dialog.current.close();
  }, [modalOpen]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((previous) => previous.buscar === search.trim() ? previous : { ...previous, buscar: search.trim() });
      setPage(1);
    }, 280);
    return () => clearTimeout(timeout);
  }, [search]);

  function updateFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  }
  function reset() {
    setFilters({});
    setSearch("");
    setPage(1);
  }
  function setRange(preset) {
    const range = preset === "week" ? { desde: dates.semana, hasta: today }
      : preset === "month" ? { desde: dates.mes, hasta: today } : monthRange(today, -1);
    setFilters((previous) => ({ ...previous, ...range }));
    setPage(1);
  }
  function switchView(next) {
    setView(next);
    setPage(1);
  }
  function changeMonth(next) {
    setMonth(next);
    setSelected(next === today ? today : "");
    setPage(1);
  }
  const reload = () => setRefresh((value) => value + 1);

  function open(next) {
    setActionError("");
    setModal(next);
    closeButton.current?.focus();
  }
  function close() {
    if (action.current || (dirty.current && !window.confirm("¿Descartar los cambios sin guardar?"))) return;
    open(null);
  }

  async function perform(task, onSuccess) {
    if (action.current) return;
    action.current = true;
    setPending(true);
    setActionError("");
    setNotice("");
    try {
      await task();
      onSuccess();
    } catch (error) {
      setActionError(error.message);
    } finally {
      action.current = false;
      setPending(false);
    }
  }

  function repeat(id) {
    if (action.current) return;
    if (repeatRequest.current?.source !== id) repeatRequest.current = { source: id, id: crypto.randomUUID() };
    void perform(async () => {
      try {
        await historyApi.repeat(id, repeatRequest.current.id);
      } catch (error) {
        if (error.status === 409) {
          repeatRequest.current = null;
          throw new Error("Puede haber un entrenamiento en curso. Ve al registro para continuar o resolver su estado.");
        }
        throw error;
      }
    }, () => router.push(`${training}&continuar=1`));
  }
  function compare(row) {
    if (reference) open({ kind: "compare", other: row.id });
    else setReference(row);
  }

  const summary = activity.data?.resumen;
  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "orden" && value);
  const rows = list.data?.entrenamientos ?? [];
  return <main className="history-page">
    <div className="history-shell">
      <nav className="history-nav" aria-label="Entrenamientos">
        <Link href={training}>Registro de entrenamiento</Link>
        <Link href={`/dashboard/entrenamientos/progreso?${query}`}>Progreso por ejercicio</Link>
      </nav>
      <header className="history-heading">
        <h1>Historial de entrenamientos</h1>
        <p>Consulta, compara y reutiliza tus sesiones realizadas.</p>
      </header>
      {activity.error && <ErrorState message={activity.error} onRetry={reload} />}
      {summary && <dl className="history-summary">
        <div><dt>Entrenamientos</dt><dd>{summary.total}</dd></div>
        <div><dt>Esta semana</dt><dd>{summary.semana}</dd></div>
        <div><dt>Tiempo total</dt><dd>{minutes(summary.tiempo)}</dd></div>
        <div><dt>Este mes</dt><dd>{summary.mes}</dd></div>
      </dl>}
      {summary?.total > 0 && <details className="history-panel">
        <summary>Resumen de actividad</summary>
        <p>{summary.dias} días con actividad · {minutes(summary.promedio)} de duración promedio · {activity.data.grupos.reduce((sum, item) => sum + item.series, 0)} series</p>
        {activity.data.grupos.length > 0 && <p className="history-muted">Grupos con más series: {activity.data.grupos.slice(0, 3).map((item) => `${item.grupo} (${item.series})`).join(" · ")}</p>}
      </details>}
      <section className="history-toolbar" aria-label="Buscar sesiones">
        {view === "list" && <label className="history-search"><span className="history-visually-hidden">Buscar entrenamientos</span>
          <input type="search" placeholder="Buscar entrenamientos, rutinas o ejercicios…" maxLength={120} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>}
        <div className="history-between">
          <div className="history-actions" aria-label="Vista del historial">
            <button aria-pressed={view === "list"} onClick={() => switchView("list")}>Listado</button>
            <button aria-pressed={view === "calendar"} onClick={() => switchView("calendar")}>Calendario</button>
          </div>
          {view === "list" && <label className="history-sort"><span className="history-visually-hidden">Orden</span>
            <select value={filters.orden ?? "recientes"} onChange={(e) => updateFilter("orden", e.target.value)}>
              <option value="recientes">Más recientes</option><option value="antiguos">Más antiguos</option>
              <option value="larga">Mayor duración</option><option value="corta">Menor duración</option>
              <option value="volumen">Mayor volumen de fuerza</option>
            </select>
          </label>}
        </div>
        {view === "list" && <details className="history-filters">
          <summary>Filtros {hasFilters && <span className="history-indicator" />}</summary>
          <div className="history-form-grid">
            <label>Fecha específica<input type="date" value={filters.desde && filters.desde === filters.hasta ? filters.desde : ""}
              onChange={(e) => { const value = e.target.value; setFilters((previous) => ({ ...previous, desde: value, hasta: value })); setPage(1); }} /></label>
            {fields.map(([key, label, type]) => <label key={key}>{label}<input type={type} maxLength={120} min={type === "number" ? 0 : undefined}
              max={type === "number" ? 1440 : undefined} value={filters[key] ?? ""} onChange={(e) => updateFilter(key, e.target.value)} /></label>)}
            <label className="history-check"><input type="checkbox" checked={!!filters.records} onChange={(e) => updateFilter("records", e.target.checked)} /> Solo con récords personales</label>
          </div>
          <div className="history-actions">
            <button onClick={() => setRange("week")}>Esta semana</button><button onClick={() => setRange("month")}>Este mes</button>
            <button onClick={() => setRange("previous")}>Mes anterior</button><button onClick={reset}>Limpiar filtros</button>
          </div>
        </details>}
      </section>
      {view === "calendar" && activity.data && <HistoryCalendar month={month} setMonth={changeMonth} today={today} selected={selected}
        onDate={(date) => { setSelected(date); setPage(1); }} days={activity.data.dias} />}
      {view === "calendar" && !activity.data && !activity.error && <p role="status">Cargando calendario…</p>}
      {view === "calendar" && selected && <h2>{fullDate(selected)}</h2>}
      {reference && <div className="history-panel history-between" role="status">
        <p>Referencia: <strong>{reference.nombre || "Entrenamiento"}</strong>. Elige otra sesión desde su menú.</p>
        <button onClick={() => setReference(null)}>Cancelar comparación</button>
      </div>}
      {notice && <p role="status" className="history-panel">{notice}</p>}
      {actionError && !modal && <div className="history-error" role="alert"><p>{actionError}</p><Link href={training}>Ir al registro</Link></div>}
      {list.error && <ErrorState message={list.error} onRetry={reload} />}
      {!list.data && !list.error && (view === "list" || selected) && <p role="status">Cargando entrenamientos…</p>}
      {list.data && rows.length === 0 && <section className="history-empty">
        <span aria-hidden="true">▥</span>
        <h2>{summary?.total === 0 ? "Tu historial empieza con una sesión" : "No hay sesiones para esta consulta"}</h2>
        {summary?.total === 0 ? <>
          <p>Cuando finalices tu primer entrenamiento, aparecerá aquí.</p>
          <div className="history-actions"><Link className="history-primary" href={training}>Iniciar mi primer entrenamiento</Link><Link href={routines}>Mis rutinas</Link></div>
        </> : hasFilters && view === "list" && <button onClick={reset}>Limpiar filtros</button>}
      </section>}
      <HistoryList rows={rows} order={listParams.orden} query={query} comparison={reference} pending={pending}
        onDetail={(id) => open({ kind: "detail", id })} onEdit={(id) => open({ kind: "edit", id })} onRepeat={repeat}
        onCompare={compare} onDelete={(row) => open({ kind: "delete", row })} />
      {(page > 1 || list.data?.siguiente) && <div className="history-between">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page}</span>
        <button disabled={!list.data?.siguiente} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>}
      <dialog ref={dialog} className="history-dialog" aria-label="Información del entrenamiento"
        onCancel={(event) => { event.preventDefault(); close(); }}>
        <div className="history-dialog-close"><button type="button" ref={closeButton} onClick={close}>Cerrar</button></div>
        {modal && <div className="history-stack">
          {actionError && <div className="history-error" role="alert"><p>{actionError}</p>{modal.kind === "detail" && <Link href={training}>Ir al registro</Link>}</div>}
          {(detail.error || comparison.error) && <ErrorState message={detail.error || comparison.error} onRetry={reload} />}
          {modal.id && !detail.data && !detail.error && <p role="status">Cargando sesión…</p>}
          {modal.kind === "detail" && detail.data && <HistoryDetail detail={detail.data} query={query} onRepeat={repeat} pending={pending} onEdit={(id) => open({ kind: "edit", id })} />}
          {modal.kind === "edit" && detail.data && <HistoryEditor key={detail.data.id} detail={detail.data} today={today}
            registerChanges={registerChanges} pending={pending}
            onSave={(input) => perform(() => historyApi.update(detail.data.id, input), () => {
              dirty.current = false; open({ kind: "detail", id: detail.data.id }); reload(); setNotice("Cambios guardados.");
            })} />}
          {modal.kind === "compare" && (comparison.data ? <HistoryComparison data={comparison.data} /> :
            !comparison.error && <p role="status">Cargando comparación…</p>)}
          {modal.kind === "delete" && <>
            <h2>¿Eliminar este entrenamiento?</h2>
            <p>Vas a eliminar «{modal.row.nombre || "Entrenamiento"}», del {fullDate(modal.row.fecha)}.</p>
            <p>Esta acción actualizará las estadísticas y los récords personales asociados. Tus rutinas se conservan.</p>
            <div className="history-actions">
              <button disabled={pending} onClick={close}>Cancelar</button>
              <button disabled={pending} className="history-danger" onClick={() => perform(() => historyApi.delete(modal.row.id), () => {
                if (reference?.id === modal.row.id) setReference(null);
                open(null); setPage(1); reload(); setNotice("Entrenamiento eliminado.");
              })}>{pending ? "Eliminando…" : "Eliminar entrenamiento"}</button>
            </div>
          </>}
        </div>}
      </dialog>
    </div>
  </main>;
}
