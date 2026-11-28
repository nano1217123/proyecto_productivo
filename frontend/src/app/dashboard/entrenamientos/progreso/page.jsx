import LegacyProgressRoute from "@/src/features/progress/LegacyProgressRoute";

export const metadata = { title: "Mi progreso" };

export default async function Page({ searchParams }) {
  const { gym, modo } = await searchParams;
  return <LegacyProgressRoute gym={gym} modo={modo} />;
}
