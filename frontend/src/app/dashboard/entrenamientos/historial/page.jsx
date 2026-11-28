import TrainingHistoryPage from "@/src/features/training/views/TrainingHistoryPage";

export default async function Page({ searchParams }) {
  const { gym, dia, sesion } = await searchParams;
  return <TrainingHistoryPage gym={gym}
    initialDay={typeof dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dia) && Number.isFinite(Date.parse(dia)) ? dia : ""}
    initialSession={typeof sesion === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(sesion) ? sesion : ""} />;
}