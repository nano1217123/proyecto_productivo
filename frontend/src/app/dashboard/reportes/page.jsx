import CentroReportes from "@/src/features/reports/CentroReportes";

export const metadata = { title: "Centro de reportes" };

export default async function ReportesPage({ searchParams }) {
  const { gym } = await searchParams;
  return <CentroReportes gym={gym} />;
}
