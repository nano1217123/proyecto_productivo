import RoutineListPage from "@/src/features/routines/views/RoutineListPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <RoutineListPage gym={gym} />;
}