"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { normalize } from "@/src/features/training/hooks/trainingSessionModel";
import { routinesApi } from "../api/routinesApi";
import RoutineCard from "../components/RoutineCard";
import { useRoutineActions } from "../hooks/useRoutineActions";
import { routineUrl, weekdays } from "../routineModel";
import "./routines.css";

export default function RoutineListPage({ gym = "jj-poblado" }) {
  const { loading } = useAuth();
  const [view, setView] = useState("active");
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const archived = view === "archived";
  const actions = useRoutineActions(() => setReload((value) => value + 1));
  const create = routineUrl(gym, "/nueva");

  useEffect(() => {
    if (loading) return;
    let current = true;
    setItems(null);
    setError("");
    routinesApi.getRoutines(archived).then((data) => {
      if (current) setItems(data);
    }).catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [archived, reload, loading]);

  const filtered = (items ?? []).filter((routine) => normalize(
    [routine.nombre, routine.descripcion, ...routine.ejercicios.map((item) => item.grupo_nombre)].join(" ")
  ).includes(normalize(search.trim()))).sort((a, b) => sort === "name"
    ? a.nombre.localeCompare(b.nombre, "es")
    : Date.parse(b.actualizadoEn) - Date.parse(a.actualizadoEn));

  return <main className="routine-page routine-list-page">
    <header className="routine-header">
      <div><h1>Mis rutinas</h1><p>Organiza tus entrenamientos a tu manera.</p></div>
      <Link className="routine-primary routine-new" href={create}>+ Nueva rutina</Link>
    </header>
    {view !== "week" && <label className="routine-search">
      <span className="routine-visually-hidden">Buscar rutina</span>
      <input type="search" placeholder="Buscar mis rutinas…" value={search} onChange={(event) => setSearch(event.target.value)} />
    </label>}
    <div className="routine-list-controls">
      <nav className="routine-actions routine-tabs" aria-label="Vistas de rutinas">
        {[["active", "Activas"], ["archived", "Archivadas"], ["week", "Semana"]].map(([id, label]) =>
          <button type="button" key={id} aria-pressed={view === id} onClick={() => {
            if ((id === "archived") !== archived) setItems(null);
            setView(id);
          }}>{label}</button>)}
      </nav>
      {view !== "week" && <label className="routine-sort">
        <span className="routine-visually-hidden">Ordenar por</span>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="updated">Más recientes</option><option value="name">Por nombre</option>
        </select>
      </label>}
    </div>
    {actions.notice && <p role="status">{actions.notice}</p>}
    {actions.actionError && <p className="routine-error" role="alert">{actions.actionError}</p>}
    {error && <p className="routine-error" role="alert">{error} <button type="button" onClick={() => setReload(reload + 1)}>Reintentar</button></p>}
    {items === null && !error && <p role="status">Cargando rutinas…</p>}
    {items && (view === "week" ? <section className="routine-week" aria-label="Planificación semanal">
      {weekdays.map((day, index) => {
        const assigned = items.filter((item) => item.dias.includes(index + 1));
        return <article className="routine-card routine-panel" key={day}>
          <h2>{day}</h2>
          {assigned.length ? <ul>{assigned.map((item) => <li key={item.id}>
            <Link href={routineUrl(gym, `/${item.id}`)}>{item.nombre}</Link>
          </li>)}</ul> : <p className="routine-muted">Sin rutinas asignadas</p>}
        </article>;
      })}
      <p>Para asignar o mover una rutina, edita sus días desde el detalle.</p>
    </section> : <>
      <p role="status" className="routine-muted">{filtered.length} de {items.length} rutinas {archived ? "archivadas" : "activas"}</p>
      {filtered.length ? <section className="routine-grid" aria-label="Rutinas">
        {filtered.map((rutina, index) => <RoutineCard key={rutina.id} featured={!archived && index === 0} rutina={rutina} gym={gym} onChange={actions.change} busy={actions.busy} />)}
      </section> : <section className="routine-card routine-empty">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 8v8m3-11v14m12-14v14m3-11v8M6 12h12M1 12h2m18 0h2"/></svg>
        <h2>{items.length ? "Sin coincidencias" : archived ? "No tienes rutinas archivadas" : "Crea tu primera rutina"}</h2>
        <p>{items.length ? "Prueba otra búsqueda." : archived ? "Las rutinas que archives aparecerán aquí." : "Elige ejercicios del catálogo y guarda tu plan para la próxima sesión."}</p>
        {!items.length && !archived && <Link className="routine-primary" href={create}>Crear rutina</Link>}
      </section>}
    </>)}
  </main>;
}
