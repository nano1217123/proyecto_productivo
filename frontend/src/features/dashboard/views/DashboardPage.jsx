"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useActiveTraining } from "@/src/features/training/hooks/useActiveTraining";
import { useHistoryRequest } from "@/src/features/training/hooks/useHistoryRequest";
import { dayLabel } from "@/src/features/training/hooks/historyDates";
import { historyApi } from "@/src/features/training/api/historyApi";
import { routinesApi } from "@/src/features/routines/api/routinesApi";
import { readNutrition } from "@/src/features/nutrition/api/nutritionApi";
import { greeting, localHomeDate, weekDays } from "../homeModel";
import HomeTraining from "../components/HomeTraining";
import { HomeModules, HomeWeek } from "../components/HomeActivity";
import { HomeLatest, HomeNutrition, HomeProgress, HomeSubscription } from "../components/HomeSummaries";
import "./home.css";

const messages = [
  "Construye tu progreso a tu ritmo.",
  "Encuentra el ritmo que te funciona hoy.",
  "Tu entrenamiento se adapta a tu día.",
];

function Home({ profile, refreshProfile }) {
  const [now, setNow] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const [historyVersion, refreshHistory] = useState(0);
  const [routineVersion, refreshRoutines] = useState(0);
  const [nutritionVersion, refreshNutrition] = useState(0);
  const today = localHomeDate(now);
  const id = profile.idusuario;
  const active = useActiveTraining(id, refreshProfile);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  const history = useHistoryRequest(`${id}:${today}:${historyVersion}:${active.summary?.id ?? ""}`, (signal) =>
    historyApi.home({ desde: weekDays(today, -3)[0], hasta: today }, signal));
  const routines = useHistoryRequest(`${id}:${routineVersion}`, routinesApi.schedule);
  const nutrition = useHistoryRequest(`${id}:${today}:${nutritionVersion}`, (signal) => readNutrition("resumen-inicio", {}, signal));

  function url(path, values = {}) {
    const query = new URLSearchParams({ ...(profile.sede ? { gym: profile.sede } : {}), ...values });
    return `/dashboard${path}${query.size ? `?${query}` : ""}`;
  }
  const initials = [profile.nombres, profile.apellidos].map((part) => part?.trim().slice(0, 1)).join("").toUpperCase();
  const updateHistory = () => refreshHistory((value) => value + 1);
  const updateRoutines = () => refreshRoutines((value) => value + 1);

  return <main className="home-dashboard">
    <header className="home-header">
      <div><p><time dateTime={today}>{dayLabel(today, { weekday: "long", day: "numeric", month: "long" })}</time></p>
        <h1>¡{greeting(now.getHours())}, {profile.nombres}!</h1>
        <p>{messages[now.getDate() % messages.length]}</p>
      </div>
      {initials && <span className="home-avatar" aria-hidden="true">{initials}</span>}
    </header>
    <div className="home-grid">
      <div className="home-column">
        <HomeTraining {...{ active, history, routines, today, now, url }} />
        <div className="home-week-block"><HomeWeek {...{ today, offset, setOffset, history, routines, url }} retry={updateHistory} /></div>
        <HomeModules {...{ routines, history, profile, url }} retry={updateRoutines} />
        <HomeLatest {...{ history, active, url }} retry={updateHistory} />
      </div>
      <div className="home-column">
        <HomeNutrition {...{ nutrition, url }} retry={() => refreshNutrition((value) => value + 1)} />
        <HomeProgress {...{ today, history, url }} retry={updateHistory} particular={profile.tipo_usuario === "usuario_particular"} />
        <HomeSubscription {...{ profile, url }} />
      </div>
    </div>
  </main>;
}

export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth();
  if (!profile?.idusuario) return null;
  return <Home key={profile.idusuario} {...{ profile, refreshProfile }} />;
}
