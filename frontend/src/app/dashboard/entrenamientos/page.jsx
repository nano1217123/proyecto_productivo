import TrainingPage from "@/src/features/training/views/TrainingPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <TrainingPage gym={gym} />;
}