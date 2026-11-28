import TrainingHistoryPage from "@/src/features/training/views/TrainingHistoryPage";

export const metadata = { title: "Historial de entrenamiento" };

function fechaCivil(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : "";
}

export default async function Page({ searchParams }) {
  const { gym, dia, sesion, desde, hasta } = await searchParams;
  const day = fechaCivil(dia);
  const start = day || fechaCivil(desde);
  const end = day || fechaCivil(hasta);
  const initialRange = start && end && start > end ? {} : { desde: start, hasta: end };
  return <TrainingHistoryPage gym={gym} initialRange={initialRange}
    initialSession={typeof sesion === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(sesion) ? sesion : ""} />;
}
