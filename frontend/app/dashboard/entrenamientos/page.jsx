import TrainingPage from "@/features/training/pages/TrainingPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <TrainingPage gym={gym} />;
}