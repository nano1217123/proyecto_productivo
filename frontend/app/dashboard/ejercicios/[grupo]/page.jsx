import ExerciseGroupPage from "@/features/exercises/pages/ExerciseGroupPage";

export default function Page({ params, searchParams }) {
  return <ExerciseGroupPage groupSlug={params.grupo} gym={searchParams.gym} />;
}
