'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { useDailyMetrics } from '../hooks/useDailyMetrics.js';
import DailyMetricsConflict from '../components/DailyMetricsConflict.jsx';

export default function ParticularDashboardPage() {
  const formularioRef = useRef(null);
  const { habits, errorCarga, guardando, mensaje, controlesBloqueados, puedeGuardar,
    editar, recargar, guardarCambios, conflicto, consultarNuevoDia, resolverConflicto } = useDailyMetrics();

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Modo Autónomo</h1>
        <p className="text-gray-400">Gestiona tu salud sin necesidad de un gimnasio físico.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121214] p-6 rounded-2xl border border-gray-800 relative">
          <h2 ref={formularioRef} tabIndex={-1} className="text-xl font-semibold mb-6">Tracker de Hoy</h2>
          
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Peso actual (kg)</label>
              <input 
                type="number"
                value={habits.weight}
                onChange={(e) => editar('weight', e.target.value)}
                disabled={controlesBloqueados}
                className="bg-[#0B0B0C] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-[#A855F7]"
                placeholder="Ej. 75.5"
              />
            </div>

            

            <button 
              onClick={() => editar('workoutDone', (completado) => !completado)}
              disabled={controlesBloqueados}
              className={`w-full flex justify-between p-4 rounded-xl border transition ${habits.workoutDone ? 'border-[#A855F7] bg-[#A855F7]/10' : 'border-gray-700'}`}
            >
              <span>Entrenamiento completado</span>
              <span>{habits.workoutDone ? '✅' : '⭕'}</span>
            </button>
            
            <button 
              onClick={() => editar('water', (water) => Math.min(water + 1, 8))}
              disabled={controlesBloqueados}
              className="w-full flex justify-between p-4 rounded-xl border border-gray-700 hover:border-blue-500"
            >
              <span>Hidratación ({habits.water}/8 vasos)</span>
              <span className="text-blue-400">💧</span>
            </button>
          </div>

          {conflicto && (
            <DailyMetricsConflict
              conflicto={conflicto}
              consultarNuevoDia={consultarNuevoDia}
              resolverConflicto={resolverConflicto}
              formularioRef={formularioRef}
            />
          )}
          <button 
            onClick={guardarCambios}
            disabled={guardando || !puedeGuardar}
            className="mt-6 w-full bg-[#A855F7] hover:bg-purple-600 disabled:bg-gray-700 text-white py-3 rounded-xl font-bold transition"
          >
            {guardando ? 'Guardando...' : 'Guardar Progreso'}
          </button>
          
          {mensaje && (
            <p className="mt-4 text-center text-sm" role="status">
              {mensaje.texto}
              {errorCarga && (
                <button type="button" onClick={recargar} className="ml-2 underline">
                  Reintentar
                </button>
              )}
            </p>
          )}
        </div>

        <div className="bg-[#121214] p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xl font-semibold mb-6">Herramientas de Autogestión</h2>
          <div className="flex flex-col gap-4">
            <Link href="/dashboard/ejercicios?modo=casa" className="p-4 rounded-xl border border-gray-700 hover:border-[#A855F7] transition flex items-center gap-3">
              <span className="text-2xl">🏋️‍♂️</span> Catálogo de Ejercicios (En Casa)
            </Link>
            <Link href="/dashboard/nutricion" className="p-4 rounded-xl border border-gray-700 hover:border-[#A855F7] transition flex items-center gap-3">
              <span className="text-2xl">🥗</span> Calcular IMC y Nutrición
            </Link>
            <Link href="/dashboard/rutinas" className="p-4 rounded-xl border border-gray-700 hover:border-[#A855F7] transition flex items-center gap-3">
              <span className="text-2xl">📋</span> Mis Rutinas Personalizadas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
