import TrainingProgressPage from "@/src/features/training/views/TrainingProgressPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <TrainingProgressPage gym={gym} />;
}
