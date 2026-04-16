import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { logoutUser } from '../../firebase';
import { Activity, Calculator, Stethoscope, BookOpen } from 'lucide-react';
import MacroCalculatorForm from '../MacroCalculatorForm';
import NutriFinancialDashboard from './NutriFinancialDashboard';
import CitasNutri from './CitasNutri';
import DietaRepositorio from '../DietaRepositorio';
import NutritionAssistant from '../NutritionAssistant';

function NutriologoPortal() {
  const nutritionistName = localStorage.getItem('nutritionist_username') || 'Nutriologo';
  const [activeTab, setActiveTab] = useState('calculadora');

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem('nutritionist_token');
    localStorage.removeItem('nutritionist_username');
    window.location.href = '/nutriologo/login';
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">FitData Nutrition Lab</p>
            <h1 className="text-2xl font-black">Portal de Nutriologo</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 md:block">
              {nutritionistName}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Cerrar sesion
            </button>
            <Link to="/" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
              Inicio
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-sm text-cyan-100">
          Este portal incluye gestión de citas, calculadora nutricional y una pestaña financiera para medir ingresos por consultas y planes.
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('citas')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'citas'
                ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Stethoscope size={16} />
            Citas y Expedientes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculadora')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'calculadora'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Calculator size={16} />
            Calculadora
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dietas')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'dietas'
                ? 'bg-orange-500/20 text-orange-200 border border-orange-400/40'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen size={16} />
            Repositorio de Dietas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financiero')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === 'financiero'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Activity size={16} />
            Financiero
          </button>
        </div>

        {activeTab === 'citas' && <CitasNutri embedded />}
        {activeTab === 'calculadora' && <MacroCalculatorForm />}
        {activeTab === 'dietas' && <DietaRepositorio />}
        {activeTab === 'financiero' && <NutriFinancialDashboard />}
      </main>

      <NutritionAssistant />
    </div>
  );
}

export default NutriologoPortal;


