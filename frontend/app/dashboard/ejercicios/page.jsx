import ExercisesPage from "@/features/exercises/pages/ExercisesPage";
import RoleGuard from "@/features/auth/components/RoleGuard";

export default async function Page({ searchParams }) {
  const { gym } = await searchParams;
  return (
    <RoleGuard allowedRoles={["cliente"]}>
      <ExercisesPage gym={gym} />
    </RoleGuard>
  );
}