import RoutineFormPage from "@/src/features/routines/views/RoutineFormPage";

export const metadata = { title: "Editar rutina" };

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { gym } = await searchParams;
  return <RoutineFormPage gym={gym} rutinaId={id} />;
}