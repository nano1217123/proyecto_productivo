'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { guardarMetricasHoy, obtenerMetricasHoy } from '../api/particularApi';

export default function ParticularDashboardPage() {
  const [habits, setHabits] = useState({ water: 0, workoutDone: false, weight: '' });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const res = await obtenerMetricasHoy();
        // Asumiendo que tu backend devuelve { success: true, data: {...} }
        if (res.data) {
          setHabits({
            water: res.data.vasosAgua || 0,
            workoutDone: res.data.entrenamientoCompletado || false,
            weight: res.data.pesoActualKg || ''
          });
        }
      } catch (error) {
        console.log('Aún no hay métricas hoy');
      }
    };
    cargarDatos();
  }, []);

  const handleSave = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      await guardarMetricasHoy({
        pesoActualKg: habits.weight ? Number(habits.weight) : undefined,
        vasosAgua: habits.water,
        entrenamientoCompletado: habits.workoutDone
      });
      setMensaje('✅ Progreso guardado exitosamente en Neon.');
    } catch (error) {
      setMensaje('❌ Error al guardar. Revisa la consola.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Modo Autónomo</h1>
        <p className="text-gray-400">Gestiona tu salud sin necesidad de un gimnasio físico.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#121214] p-6 rounded-2xl border border-gray-800 relative">
          <h2 className="text-xl font-semibold mb-6">Tracker de Hoy</h2>
          
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Peso actual (kg)</label>
              <input 
                type="number"
                value={habits.weight}
                onChange={(e) => setHabits({ ...habits, weight: e.target.value })}
                className="bg-[#0B0B0C] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-[#A855F7]"
                placeholder="Ej. 75.5"
              />
            </div>

            

            <button 
              onClick={() => setHabits({ ...habits, workoutDone: !habits.workoutDone })}
              className={`w-full flex justify-between p-4 rounded-xl border transition ${habits.workoutDone ? 'border-[#A855F7] bg-[#A855F7]/10' : 'border-gray-700'}`}
            >
              <span>Entrenamiento completado</span>
              <span>{habits.workoutDone ? '✅' : '⭕'}</span>
            </button>
            
            <button 
              onClick={() => setHabits({ ...habits, water: Math.min(habits.water + 1, 8) })}
              className="w-full flex justify-between p-4 rounded-xl border border-gray-700 hover:border-blue-500"
            >
              <span>Hidratación ({habits.water}/8 vasos)</span>
              <span className="text-blue-400">💧</span>
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={guardando}
            className="mt-6 w-full bg-[#A855F7] hover:bg-purple-600 disabled:bg-gray-700 text-white py-3 rounded-xl font-bold transition"
          >
            {guardando ? 'Guardando...' : 'Guardar Progreso'}
          </button>
          
          {mensaje && <p className="mt-4 text-center text-sm">{mensaje}</p>}
        </div>

        <div className="bg-[#121214] p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xl font-semibold mb-6">Herramientas de Autogestión</h2>
          <div className="flex flex-col gap-4">
            <Link href="/dashboard/ejercicios" className="p-4 rounded-xl border border-gray-700 hover:border-[#A855F7] transition flex items-center gap-3">
              <span className="text-2xl">🏋️‍♂️</span> Catálogo de Ejercicios
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