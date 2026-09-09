import RoutineFormPage from "@/features/routines/pages/RoutineFormPage";

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { gym } = await searchParams;
  return <RoutineFormPage gym={gym} rutinaId={Number(id)} />;
}