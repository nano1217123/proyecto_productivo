import RoutineFormPage from "@/features/routines/pages/RoutineFormPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <RoutineFormPage gym={gym} />;
}