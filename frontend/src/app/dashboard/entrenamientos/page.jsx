import TrainingPage from "@/src/features/training/views/TrainingPage";

export const metadata = { title: "Registrar entrenamiento" };

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <TrainingPage gym={gym} />;
}