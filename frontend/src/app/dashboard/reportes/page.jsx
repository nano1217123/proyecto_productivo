import CentroReportes from "@/src/features/reports/CentroReportes";

export default async function ReportesPage({ searchParams }) {
  const { gym } = await searchParams;
  return <CentroReportes gym={gym} />;
}
