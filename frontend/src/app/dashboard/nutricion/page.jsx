import NutritionPage from "@/src/features/nutrition/views/NutritionPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <NutritionPage gym={gym} />;
}