"use client";

import Link from "next/link";
import { routineStats, routineUrl, weekdays } from "../routineModel";

export function RoutineFacts({ rutina }) {
  const { series, groups, minutes } = routineStats(rutina.ejercicios);
  return <>
    <div className="routine-tags">
      {groups.map((group) => <span key={group}>{group}</span>)}
    </div>
    <p>{rutina.ejercicios.length} ejercicios · {series} series{minutes != null && ` · ${minutes} min estimados`}</p>
    <p className="routine-muted">{rutina.dias.map((day) => weekdays[day - 1]).join(", ") || "Sin días asignados"}{rutina.dia_etiqueta && ` · ${rutina.dia_etiqueta}`}</p>
  </>;
}

export function RoutineActions({ rutina, gym, onChange, busy }) {
  const start = `/dashboard/entrenamientos?gym=${encodeURIComponent(gym)}&rutina=${encodeURIComponent(rutina.id)}`;
  return <div className="routine-actions">
    {!rutina.archivada && <Link className="routine-primary" href={start}>Iniciar entrenamiento</Link>}
    {rutina.archivada && <button type="button" disabled={busy} onClick={() => onChange("restore", rutina)}>Restaurar</button>}
    <RoutineMenu rutina={rutina} gym={gym} onChange={onChange} busy={busy} />
  </div>;
}

function RoutineMenu({ rutina, gym, onChange, busy, compact }) {
  return <details className="routine-menu">
    <summary aria-label={`Opciones de ${rutina.nombre}`}>{compact ? "⋮" : "Opciones"}</summary>
    <div>
      <Link href={routineUrl(gym, `/${rutina.id}/editar`)}>Editar</Link>
      <Link href={`${routineUrl(gym, "/nueva")}&copia=${rutina.id}`}>Duplicar</Link>
      {!rutina.archivada && <button type="button" disabled={busy} onClick={() => onChange("archive", rutina)}>Archivar</button>}
      <button type="button" className="routine-danger" disabled={busy} onClick={() => onChange("delete", rutina)}>Eliminar rutina</button>
    </div>
  </details>;
}

export default function RoutineCard({ rutina, gym, onChange, busy, featured }) {
  const image = rutina.ejercicios.find((item) => item.imagen_url)?.imagen_url;
  const highlight = featured && Boolean(image);
  const { series, groups, minutes } = routineStats(rutina.ejercicios);
  const days = rutina.dias.map((day) => weekdays[day - 1]).join(", ") || rutina.dia_etiqueta;
  const detail = routineUrl(gym, `/${rutina.id}`);
  const copy = `${routineUrl(gym, "/nueva")}&copia=${rutina.id}`;
  const start = `/dashboard/entrenamientos?gym=${encodeURIComponent(gym)}&rutina=${encodeURIComponent(rutina.id)}`;
  return <article className={`routine-card routine-tile${highlight ? " routine-featured" : ""}`}>
    {highlight && <img className="routine-cover" src={image} alt="" />}
    <div className="routine-tile-heading">
      {image && !highlight && <img className="routine-media routine-thumbnail" src={image} alt="" loading="lazy" />}
      <div className="routine-tile-title">
        <h2><Link href={detail}>{rutina.nombre}</Link></h2>
        <p className="routine-muted">{days && `${days} · `}{rutina.ejercicios.length} ejercicios · {series} series</p>
      </div>
      <RoutineMenu rutina={rutina} gym={gym} onChange={onChange} busy={busy} compact />
    </div>
    {rutina.descripcion && <p className="routine-muted routine-description">{rutina.descripcion}</p>}
    <div className="routine-tags">
      {groups.map((group) => <span key={group}>{group}</span>)}
      {minutes != null && <span>{minutes} min aprox.</span>}
    </div>
    <p className="routine-muted routine-updated">Actualizada el {new Date(rutina.actualizadoEn).toLocaleDateString("es-CO")}</p>
    <div className="routine-tile-footer">
      <Link href={routineUrl(gym, `/${rutina.id}/editar`)}>Editar</Link>
      {!highlight && <Link href={copy}>Duplicar</Link>}
      {rutina.archivada
        ? <button type="button" disabled={busy} onClick={() => onChange("restore", rutina)}>Restaurar</button>
        : <Link className="routine-primary" href={start} aria-label={`Iniciar entrenamiento con ${rutina.nombre}`}>Entrenar</Link>}
    </div>
  </article>;
}
