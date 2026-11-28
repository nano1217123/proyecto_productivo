import RoutineDetailPage from "@/src/features/routines/views/RoutineDetailPage";

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { gym } = await searchParams;
  return <RoutineDetailPage gym={gym} rutinaId={id} />;
}