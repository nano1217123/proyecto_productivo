// app/dashboard/ejercicios/page.jsx
import ExercisesPage from "@/features/exercises/views/ExercisesPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <ExercisesPage gym={gym} />;
}