import TrainingHistoryPage from "@/features/training/pages/TrainingHistoryPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <TrainingHistoryPage gym={gym} />;
}