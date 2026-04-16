import React, { useState } from 'react';
import { ChevronRight, Dumbbell, Apple, ArrowLeft, Users, XCircle, Activity, FileDown, ClipboardList, Calendar } from 'lucide-react';

import ClientRoutine from '../ClientRoutine';
import ClienteEntrenador from '../ClienteEntrenador';
import ClientNutriView from '../ClientNutriView';
import ClientDietViewer from '../ClientDietViewer';
import ClientTrainingNeedsAnalysis from '../ClientTrainingNeedsAnalysis';
import NutriologosList from '../NutriologosList';
import EntrenadoresList from '../EntrenadoresList';
import NutritionAppointments from '../NutritionAppointments';

function ClientPlanView() {
  const [currentView, setCurrentView] = useState('menu');

  // Función botón de "Volver"
  const renderBackButton = (targetView, label) => (
    <button
      onClick={() => setCurrentView(targetView)}
      className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
    >
      <ArrowLeft size={20} />
      <span className="font-bold">{label}</span>
    </button>
  );

  // SUBMENÚ DEL ENTRENADOR
  if (currentView === 'entrenador_menu') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('menu', 'Volver a Mi Programa')}

        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 border border-slate-700">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 to-cyan-400"></div>

            <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300">
                Área de Entrenamiento
              </h2>
              <p className="text-slate-400 font-medium mt-1.5">
                Gestiona tus rutinas y tu servicio de coach.
              </p>
            </div>

            <div className="space-y-4">
              {/* Opción 1: Seleccionar Entrenador */}
              <button 
                onClick={() => setCurrentView('entrenador_seleccionar')} 
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-blue-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                    <Users size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-blue-300 font-bold text-lg">Seleccionar Entrenador</span>
                    <span className="text-slate-400 text-sm mt-0.5">Explora el catálogo y elige a tu coach ideal.</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-500 group-hover:text-blue-400" size={24} />
              </button>

              {/* Opción 2: Ver Rutinas */}
              <button
                onClick={() => setCurrentView('entrenador_rutina')}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-cyan-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="p-3.5 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-inner">
                    <Activity size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-cyan-300 font-bold text-lg">Mis Rutinas</span>
                    <span className="text-slate-400 text-sm mt-0.5">Consulta tu plan de ejercicios y progreso.</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-500 group-hover:text-cyan-400" size={24} />
              </button>

              {/* Opción 3: Análisis de Necesidades */}
              <button
                onClick={() => setCurrentView('entrenador_analisis')}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-amber-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                    <ClipboardList size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-amber-300 font-bold text-lg">Análisis de Necesidades</span>
                    <span className="text-slate-400 text-sm mt-0.5">Responde un cuestionario y recibe una recomendación automática.</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-500 group-hover:text-amber-400" size={24} />
              </button>

              {/* Opción 4: Detener Servicio  */}
              <button
                onClick={() => setCurrentView('entrenador_cancelar')}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-red-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="p-3.5 bg-red-500/10 rounded-xl text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner">
                    <XCircle size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-red-300 font-bold text-lg">Detener Servicio</span>
                    <span className="text-slate-400 text-sm mt-0.5">Gestiona o cancela tu suscripción con el coach actual.</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-500 group-hover:text-red-400" size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // NIVEL 3: VISTAS FINALES DEL ENTRENADOR POR EL MOMENTO
  // =========================================================
  if (currentView === 'entrenador_rutina') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('entrenador_menu', 'Volver a Entrenamiento')}
        <ClientRoutine />
      </div>
    );
  }

  if (currentView === 'entrenador_cancelar') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('entrenador_menu', 'Volver a Entrenamiento')}
        <ClienteEntrenador />
      </div>
    );
  }

  if (currentView === 'entrenador_analisis') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('entrenador_menu', 'Volver a Entrenamiento')}
        <ClientTrainingNeedsAnalysis />
      </div>
    );
  }

  if (currentView === 'entrenador_seleccionar') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('entrenador_menu', 'Volver a Entrenamiento')}
        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 border border-slate-700">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 to-cyan-400"></div>

            <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300">
                Seleccionar Entrenador
              </h2>
              <p className="text-slate-400 font-medium mt-1.5">
                Elige al entrenador que mejor se adapte a tus objetivos y estilo de entrenamiento.
              </p>
            </div>

            <EntrenadoresList />
          </div>
        </div>
      </div>
    );
  }

  // SUBMENÚ NUTRIÓLOGO ///
  if (currentView === 'nutriologo_menu') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('menu', 'Volver a Mi Programa')}
        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 border border-slate-700">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-500 to-lime-400"></div>

            <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-emerald-300 to-lime-300">
                Área de Nutrición
              </h2>
              <p className="text-slate-400 font-medium mt-1.5">
                Consulta tu plan alimenticio y servicios de nutrición.
              </p>
            </div>

            <div className="space-y-4">
              {/* Opción 1: Seleccionar Nutriólogo */}
              <button 
                onClick={() => setCurrentView('nutriologo_seleccionar')} 
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-emerald-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                    <Users size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-emerald-300 font-bold text-lg">Seleccionar Nutriólogo</span>
                    <span className="text-slate-400 text-sm mt-0.5">Explora el catálogo y elige a tu especialista en nutrición.</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-500 group-hover:text-emerald-400" size={24}/>
              </button>

              {/* Opción 2: Consultar y Descargar Dieta */}
              <button
                onClick={() => setCurrentView('nutriologo_dieta')}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-lime-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="p-3.5 bg-lime-500/10 rounded-xl text-lime-400 group-hover:bg-lime-500 group-hover:text-white transition-all shadow-inner">
                    <FileDown size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lime-300 font-bold text-lg">Consultar y Descargar Dieta</span>
                    <span className="text-slate-400 text-sm mt-0.5">Consulta o descarga tu dieta vigente.</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-500 group-hover:text-lime-400" size={24}/>
              </button>

               {/* Opción 3: Mis Citas de Nutrición  */}
              <button
                onClick={() => setCurrentView('nutriologo_citas')}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-teal-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                <div className="p-3.5 bg-teal-500/10 rounded-xl text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-inner">
                    <Calendar size={28} />
                     </div>
                <div className="flex flex-col">
                 <span className="text-teal-300 font-bold text-lg">Mis Citas</span>
                 <span className="text-slate-400 text-sm mt-0.5">Gestiona, cancela o reprograma tus citas.</span>
              </div>
              </div>
               <ChevronRight className="text-slate-500 group-hover:text-teal-400" size={24}/>              
              </button>
              {/* Opción 4: Detener Servicio */}
              <button 
                onClick={() => setCurrentView('nutriologo_cancelar')} 
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:border-red-500/50"
              >
                <div className="flex items-center gap-5 text-left">
                  <div className="p-3.5 bg-red-500/10 rounded-xl text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner">
                    <XCircle size={28} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-red-300 font-bold text-lg">Detener Servicio</span>
                    <span className="text-slate-400 text-sm mt-0.5">Gestiona o cancela tu suscripción con el nutriólogo actual.</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-500 group-hover:text-red-400" size={24}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // NIVEL 3: VISTAS FINALES DE NUTRICIÓN
  // =========================================================
  if (currentView === 'nutriologo_dieta') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('nutriologo_menu', 'Volver a Nutrición')}
        <ClientDietViewer />
      </div>
    );
  }

  if (currentView === 'nutriologo_cancelar') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('nutriologo_menu', 'Volver a Nutrición')}
        <ClientNutriView />
      </div>
    );
  }

  if (currentView === 'nutriologo_seleccionar') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('nutriologo_menu', 'Volver a Nutrición')}
        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 border border-slate-700">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-emerald-500 to-lime-400"></div>

            <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-emerald-300 to-lime-300">
                Seleccionar Nutriólogo
              </h2>
              <p className="text-slate-400 font-medium mt-1.5">
                Elige al especialista en nutrición que mejor se adapte a tus necesidades.
              </p>
            </div>

            <NutriologosList />
          </div>
        </div>
      </div>
    );
  }

  // NUEVA VISTA: Panel de Citas de Nutrición
  if (currentView === 'nutriologo_citas') {
    return (
      <div className="w-full animate-fade-in">
        {renderBackButton('nutriologo_menu', 'Volver a Nutrición')}
        <NutritionAppointments />
      </div>
    );
  }

  // =========================================================
  // NIVEL 1: MENÚ PRINCIPAL RAÍZ
  // =========================================================
  // NIVEL 1: MENÚ PRINCIPAL RAÍZ //
  return (
    <div className="w-full flex justify-center animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 border border-slate-700">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 via-cyan-400 to-teal-400"></div>

        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300">
            Mi Programa Integral
          </h2>
          <p className="text-slate-400 font-medium mt-1.5">
            Selecciona el área que deseas consultar.
          </p>
        </div>

        <div className="space-y-4">
          <button onClick={() => setCurrentView('entrenador_menu')} className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:shadow-blue-900/20 hover:border-blue-500/50">
            <div className="flex items-center gap-5 text-left">
              <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                <Dumbbell size={28} />
              </div>
              <div className="flex flex-col">
                <span className="text-blue-300 font-bold group-hover:text-blue-200 text-lg tracking-wide">
                  Mi Entrenador y Rutinas
                </span>
                <span className="text-slate-400 text-sm mt-0.5">
                  Ver plan de ejercicios, días de entrenamiento y coach.
                </span>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-1.5" size={24} />
          </button>

          <button onClick={() => setCurrentView('nutriologo_menu')} className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between group transition-all duration-300 shadow-md hover:shadow-emerald-900/20 hover:border-emerald-500/50">
            <div className="flex items-center gap-5 text-left">
              <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                <Apple size={28} />
              </div>
              <div className="flex flex-col">
                <span className="text-emerald-300 font-bold group-hover:text-emerald-200 text-lg tracking-wide">
                  Mi Nutriólogo y Dieta
                </span>
                <span className="text-slate-400 text-sm mt-0.5">
                  Ver plan de alimentación, macros y nutriólogo asignado.
                </span>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1.5" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientPlanView;