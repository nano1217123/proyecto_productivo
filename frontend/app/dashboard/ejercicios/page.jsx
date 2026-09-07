// app/dashboard/ejercicios/page.jsx
import ExercisesPage from "@/features/exercises/pages/ExercisesPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <ExercisesPage gym={gym} />;
}