import RoutineFormPage from "@/src/features/routines/views/RoutineFormPage";

export const metadata = { title: "Crear rutina" };

export default async function Page({ searchParams }) {
  const { gym, copia, entrenamiento } = await searchParams;
  return <RoutineFormPage gym={gym} copia={typeof copia === "string" ? copia : undefined} entrenamiento={typeof entrenamiento === "string" ? entrenamiento : undefined} />;
}