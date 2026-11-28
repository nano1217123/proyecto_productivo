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
    <details className="routine-menu">
      <summary aria-label={`Opciones de ${rutina.nombre}`}>Opciones</summary>
      <div>
        <Link href={routineUrl(gym, `/${rutina.id}/editar`)}>Editar</Link>
        <Link href={`${routineUrl(gym, "/nueva")}&copia=${rutina.id}`}>Duplicar</Link>
        {!rutina.archivada && <button type="button" disabled={busy} onClick={() => onChange("archive", rutina)}>Archivar</button>}
        <button type="button" className="routine-danger" disabled={busy} onClick={() => onChange("delete", rutina)}>Eliminar rutina</button>
      </div>
    </details>
  </div>;
}

export default function RoutineCard({ rutina, gym, onChange, busy }) {
  const image = rutina.ejercicios.find((item) => item.imagen_url)?.imagen_url;
  return <article className="routine-card routine-tile">
    {image && <img className="routine-cover" src={image} alt="" loading="lazy" />}
    <div className="routine-tile-body">
      <h2><Link href={routineUrl(gym, `/${rutina.id}`)}>{rutina.nombre}</Link></h2>
      {rutina.descripcion && <p className="routine-description">{rutina.descripcion}</p>}
      <RoutineFacts rutina={rutina} />
      <p className="routine-muted">Actualizada el {new Date(rutina.actualizadoEn).toLocaleDateString("es-CO")}</p>
      <RoutineActions rutina={rutina} gym={gym} onChange={onChange} busy={busy} />
    </div>
  </article>;
}
