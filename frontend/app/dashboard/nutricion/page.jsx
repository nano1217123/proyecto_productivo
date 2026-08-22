import NutritionPage from "@/features/nutrition/pages/NutritionPage";

export default function Page({ searchParams }) {
  return <NutritionPage gym={searchParams.gym} />;
}
