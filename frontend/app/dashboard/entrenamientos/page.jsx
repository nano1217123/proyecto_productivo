import TrainingPage from "@/features/training/pages/TrainingPage";
import RoleGuard from "@/features/auth/components/RoleGuard";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return <TrainingPage gym={gym} />;
}