'use client';
import Link from 'next/link';
import { enlaceReporte } from "@/src/features/reports/ReportActions";
import DailyTrackerWidget from '../components/DailyTrackerWidget.jsx';

const ESTILO_FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]';
const ESTILO_HERRAMIENTA = `p-4 rounded-xl border border-gray-700 hover:border-[#A855F7] transition flex items-center gap-3 ${ESTILO_FOCO}`;

export default function ParticularDashboardPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-6 md:p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Modo Autónomo</h1>
        <p className="text-gray-400">Gestiona tu salud sin necesidad de un gimnasio físico.</p>
      </header>
      <Link href="/dashboard/reportes" className={`${enlaceReporte} mb-6`}>
        Centro de reportes
      </Link>

      {/* Escritorio: herramientas en una columna lateral, visibles sin bajar.
          Tablet: debajo en tres columnas. Móvil: una sola columna. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Única instancia de useDailyMetrics en esta pantalla. */}
        <DailyTrackerWidget />

        <section aria-labelledby="herramientas-autogestion" className="bg-[#121214] p-6 rounded-2xl border border-gray-800">
          <h2 id="herramientas-autogestion" className="text-xl font-semibold mb-6">Herramientas de Autogestión</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4">
            <Link href="/dashboard/ejercicios?modo=casa" className={ESTILO_HERRAMIENTA}>
              <span className="text-2xl" aria-hidden="true">🏋️‍♂️</span> Catálogo de Ejercicios (En Casa)
            </Link>
            <Link href="/dashboard/nutricion" className={ESTILO_HERRAMIENTA}>
              <span className="text-2xl" aria-hidden="true">🥗</span> Calcular IMC y Nutrición
            </Link>
            <Link href="/dashboard/rutinas" className={ESTILO_HERRAMIENTA}>
              <span className="text-2xl" aria-hidden="true">📋</span> Mis Rutinas Personalizadas
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
