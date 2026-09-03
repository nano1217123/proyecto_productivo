import ExercisesPage from "@/features/exercises/pages/ExercisesPage";

export default function Page({ searchParams }) {
  return <ExercisesPage gym={searchParams.gym} />;
}
