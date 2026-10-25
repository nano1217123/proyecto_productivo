import NutritionPage from "@/features/nutrition/pages/NutritionPage";
import RoleGuard from "@/features/auth/components/RoleGuard";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <NutritionPage gym={gym} />;
}