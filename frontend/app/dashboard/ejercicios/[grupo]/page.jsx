import ExerciseGroupPage from "@/features/exercises/pages/ExerciseGroupPage";

export default async function Page({ params, searchParams }) {
  const { grupo } = await params;
  const { gym } = await searchParams;
  return <ExerciseGroupPage groupSlug={grupo} gym={gym} />;
}