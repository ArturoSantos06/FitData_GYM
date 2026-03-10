import React, { useState } from 'react';
import { ChevronRight, ClipboardList, StickyNote, Dumbbell, UserMinus, ArrowLeft } from 'lucide-react';

import TrainerClientUnlink from './TrainerClientUnlink';

function TrainerManagement() {
  const [currentView, setCurrentView] = useState('menu');

  // Pestañas secundarias
  if (currentView !== 'menu') {
    return (
      <div className="w-full animate-fade-in">
        <button 
          onClick={() => setCurrentView('menu')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} /> 
          <span className="font-bold">Volver a Gestión</span>
        </button>

        {/* Aquí mostramos el componente según lo que haya elegido */}
        {currentView === 'historial' && (
          <div className="p-8 border border-slate-800 bg-slate-900/50 text-slate-400 rounded-xl text-center">
             Aquí irá la Consulta de Historial Clínico 
          </div>
        )}
        
        {currentView === 'bitacora' && (
          <div className="p-8 border border-slate-800 bg-slate-900/50 text-slate-400 rounded-xl text-center">
            Aquí irá la Bitácora de Notas Privadas 
          </div>
        )}

        {currentView === 'rutinas' && (
          <div className="p-8 border border-slate-800 bg-slate-900/50 text-slate-400 rounded-xl text-center">
             Aquí irá la Gestión de Rutinas 
          </div>
        )}

        {currentView === 'desvinculacion' && (
          <TrainerClientUnlink />
        )}
      </div>
    );
  }

  // Tarjetas de Gestión
  return (
    <div className="w-full flex justify-center animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden p-8">
        
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-400 via-blue-400 to-purple-400">Herramientas de Gestión</h2>
          <p className="text-slate-400 font-medium mt-1.5">Selecciona la acción que deseas realizar con tus clientes.</p>
        </div>

        <div className="space-y-3">
          
          {/* Tarjeta 1: Historial Clínico */}
          <button onClick={() => setCurrentView('historial')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-transform">
                <ClipboardList size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-blue-300 font-bold group-hover:text-white text-lg">Historial Clínico</span>
                <span className="text-slate-400 text-sm hidden md:block">Consultar fichas médicas y lesiones</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" size={24}/>
          </button>

          {/* Tarjeta 2: Notas Privadas */}
          <button onClick={() => setCurrentView('bitacora')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-purple-300 group-hover:scale-110 transition-transform">
                <StickyNote size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-purple-300 font-bold group-hover:text-white text-lg">Bitácora Privada</span>
                <span className="text-slate-400 text-sm hidden md:block">Anotaciones y seguimiento de clientes</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-1" size={24}/>
          </button>

          {/* Tarjeta 3: Rutinas */}
          <button onClick={() => setCurrentView('rutinas')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:text-emerald-300 group-hover:scale-110 transition-transform">
                <Dumbbell size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-emerald-300 font-bold group-hover:text-white text-lg">Gestión de Rutinas</span>
                <span className="text-slate-400 text-sm hidden md:block">Asignar y modificar planes de entrenamiento</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1" size={24}/>
          </button>

          {/* Tarjeta 4: Desvinculación */}
          <button onClick={() => setCurrentView('desvinculacion')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-400 group-hover:text-red-300 group-hover:scale-110 transition-transform">
                <UserMinus size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-red-300 font-bold group-hover:text-white text-lg">Desvinculación y Pagos</span>
                <span className="text-slate-400 text-sm hidden md:block">Semáforo de estado y gestión de cuentas</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-red-400 transition-transform group-hover:translate-x-1" size={24}/>
          </button>

        </div>
      </div>
    </div>
  );
}

export default TrainerManagement;