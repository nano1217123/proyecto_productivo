import NutritionPage from "@/src/features/nutrition/views/NutritionPage";

export default async function Page({ searchParams }) {
  const { gym, vista } = await searchParams;
  return <NutritionPage gym={gym} initialView={vista === "alimentos" ? "catalog" : "overview"} />;
}