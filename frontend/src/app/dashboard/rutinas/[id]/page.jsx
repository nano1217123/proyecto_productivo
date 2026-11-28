import RoutineDetailPage from "@/src/features/routines/views/RoutineDetailPage";

export const metadata = { title: "Detalle de rutina" };

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { gym } = await searchParams;
  return <RoutineDetailPage gym={gym} rutinaId={id} />;
}