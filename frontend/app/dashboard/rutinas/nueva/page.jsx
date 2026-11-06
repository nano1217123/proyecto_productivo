import RoutineFormPage from "@/features/routines/views/RoutineFormPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <RoutineFormPage gym={gym} />;
}