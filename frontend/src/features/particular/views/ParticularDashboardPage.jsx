import DailyTrackerWidget from "../components/DailyTrackerWidget.jsx";

export default function ParticularDashboardPage() {
  return (
    <main className="min-h-screen bg-[#171817] px-4 py-8 text-[#f2f4ef] sm:px-6">
      <div className="mx-auto max-w-[1060px]">
        <h1 className="mb-6 text-4xl font-bold">Seguimiento diario</h1>
        <DailyTrackerWidget />
      </div>
    </main>
  );
}
