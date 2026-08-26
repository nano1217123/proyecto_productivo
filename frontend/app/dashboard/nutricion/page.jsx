import NutritionPage from "@/features/nutrition/pages/NutritionPage";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <NutritionPage gym={gym} />;
}