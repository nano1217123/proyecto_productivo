import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { historyApi } from "@/src/features/training/api/historyApi";
import { goals, grams } from "@/src/features/nutrition/components/labels";
import { dayLabel, minutes } from "@/src/features/training/hooks/historyDates";
import { useSedes } from "@/src/features/sedes/hooks/useSedes";
import { progressWeeks } from "../homeModel";
import { HomePanel, SectionState } from "./HomePanel";

export function HomeNutrition({ nutrition, retry, url }) {
  return <HomePanel title="Mi nutrición" className="home-nutrition">
    <SectionState result={nutrition} retry={retry}>{(data) => {
      const { configured, goal, tracking, reference, protein } = data;
      return <>
        {!configured && <p>Configura tu objetivo nutricional para consultar tu resumen diario.</p>}
        {configured && <p>{goals[goal]?.name}</p>}
        {configured && !tracking && <p>Seguimiento nutricional desactivado.</p>}
        {tracking && <>
          {protein == null ? <p>Sin registros de proteína hoy.</p> : <p className="home-protein"><strong>{grams(protein)}</strong> registradas hoy</p>}
          {reference ? <>
            <p>Referencia diaria · {grams(reference.minimum)}–{grams(reference.maximum)}</p>
            <progress aria-label="Proteína registrada respecto al límite inferior de la referencia"
              value={Math.min(protein ?? 0, reference.minimum)} max={reference.minimum} />
          </> : <p>Referencia diaria sin configurar.</p>}
        </>}
        <div className="home-actions">
          {tracking && <Link className="home-link" href={url("/nutricion", { vista: "alimentos" })}>Registrar alimento</Link>}
          <Link className="home-link" href={url("/nutricion")}>{configured ? "Ver nutrición" : "Configurar objetivo"}</Link>
        </div>
      </>;
    }}</SectionState>
  </HomePanel>;
}

export function HomeProgress({ today, history, retry, url, particular }) {
  return <HomePanel title="Mi progreso" className="home-progress">
    <SectionState result={history} retry={retry}>{({ dias }) => {
      const weeks = progressWeeks(today, dias);
      const total = weeks.reduce((sum, week) => sum + week.count, 0);
      const max = Math.max(...weeks.map(({ count }) => count), 1);
      return total < 2 ? <p>Tu evolución aparecerá aquí cuando registres más entrenamientos.</p> : <>
        <p>Sesiones por semana · últimas cuatro semanas</p>
        <ul className="home-chart" aria-label="Sesiones por semana">
          {weeks.map(({ start, label, count }) => <li key={start}>
            <strong>{count}</strong><div className="home-chart-track">
              <span style={{ height: `${count / max * 100}%` }} />
            </div><small>{label}</small>
          </li>)}
        </ul>
      </>;
    }}</SectionState>
    <Link className="home-link" href={url("/reportes")}>Ver mi progreso</Link>
    {particular && <Link className="home-link" href={url("/particular")}>Seguimiento diario</Link>}
  </HomePanel>;
}

export function HomeLatest({ history, active, retry, url }) {
  const router = useRouter();
  const request = useRef(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const last = history.data?.ultimo;
  if (history.data && !last) return null;

  async function repeat() {
    if (busy.current || !active.ready || active.draft || active.error) return;
    if (request.current?.source !== last.id) request.current = { source: last.id, id: crypto.randomUUID() };
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await historyApi.repeat(last.id, request.current.id);
      router.push(url("/entrenamientos", { continuar: "1" }));
    } catch (err) {
      if (err.status === 409) {
        request.current = null;
        await active.sync();
        setError("Revisa el registro de entrenamiento antes de volver a repetir la sesión.");
      } else setError("No se pudo repetir el entrenamiento. Puedes volver a intentarlo.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <HomePanel title="Último entrenamiento" className="home-latest">
    <SectionState result={history} retry={retry}>{({ ultimo }) => <>
      <h3>{ultimo.nombre || "Entrenamiento"}</h3>
      <p>{dayLabel(ultimo.fecha, { day: "numeric", month: "long", year: "numeric" })}
        {ultimo.duracion != null && ` · ${minutes(ultimo.duracion)}`} · {ultimo.ejercicios} ejercicios · {ultimo.series} series
      </p>
      {!!ultimo.grupos?.length && <p>{ultimo.grupos.filter(Boolean).join(" · ")}</p>}
      {ultimo.records > 0 && <p className="home-badge">{ultimo.records} {ultimo.records === 1 ? "récord personal" : "récords personales"}</p>}
      <div className="home-actions">
        <Link className="home-link" href={url("/entrenamientos/historial", { sesion: ultimo.id })}>Ver detalles</Link>
        <button className="home-link" type="button" onClick={repeat} disabled={pending || !active.ready || !!active.draft || !!active.error}>
          {pending ? "Preparando sesión…" : "Repetir entrenamiento"}
        </button>
      </div>
      {active.draft && <small>La opción de repetir estará disponible al cerrar tu sesión en curso.</small>}
      {error && <p role="alert">{error} <Link className="home-link" href={url("/entrenamientos", { continuar: "1" })}>Abrir registro</Link></p>}
    </>}</SectionState>
  </HomePanel>;
}

function HomeMembership({ slug }) {
  const { sede, error } = useSedes();
  const gym = sede(slug);
  return <HomePanel title="Mi membresía" className="home-membership">
    {gym ? <><h3>{gym.nombre}</h3>{gym.ubicacion && <p>{gym.ubicacion}</p>}</>
      : <p>{error ? "No pudimos consultar el nombre de tu sede." : "Consultando tu sede…"}</p>}
    <p>Cuenta vinculada a una sede. Plan y vigencia no disponibles.</p>
  </HomePanel>;
}

export function HomeSubscription({ profile, url }) {
  if (profile.tipo_usuario === "cliente") return profile.sede ? <HomeMembership slug={profile.sede} /> : null;
  if (profile.tipo_usuario !== "usuario_particular") return null;
  return <HomePanel title="Mi suscripción" className="home-membership">
    <p>Estado y vigencia sin confirmar.</p>
    <Link className="home-link" href={url("/pagos")}>Ver planes y pagos</Link>
  </HomePanel>;
}
