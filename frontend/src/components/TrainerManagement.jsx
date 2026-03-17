import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, StickyNote, Dumbbell, UserMinus, ArrowLeft, Search, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllMembers, ensureUserClaim } from '../firebase';

import TrainerClientUnlink from './TrainerClientUnlink';
import BitacoraEntrenador from './BitacoraEntrenador';
import DietaRepositorio from './DietaRepositorio';

function RoutineManagementPanel() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError('');

        await ensureUserClaim();
        const result = await getAllMembers();

        if (!result.success) {
          throw new Error(result.error || 'No se pudo cargar la lista de alumnos');
        }

        setMembers(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        setError(err.message || 'Error al cargar alumnos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return members.filter((member) => {
      const matricula = String(member.matricula || member.id || '').toLowerCase();
      const fullName = `${member.nombre || ''} ${member.apellido || ''}`.trim().toLowerCase();
      if (!normalized) return true;
      return matricula.includes(normalized) || fullName.includes(normalized);
    });
  }, [members, searchTerm]);

  return (
    <div className="p-5 border border-slate-800 bg-slate-900/50 rounded-xl">
      <h3 className="text-xl font-bold text-emerald-300 mb-4">Gestión de Rutinas</h3>

      <div className="mb-4">
        <label className="block text-sm text-slate-300 mb-2">Buscar alumno por matrícula o nombre</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ej. 1024 o Juan Pérez"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-9 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {isLoading && <div className="py-8 text-center text-slate-400">Cargando alumnos...</div>}
      {error && !isLoading && <div className="py-8 text-center text-red-400">{error}</div>}

      {!isLoading && !error && filteredMembers.length === 0 && (
        <div className="py-8 text-center text-slate-400">No se encontraron alumnos con ese criterio.</div>
      )}

      {!isLoading && !error && filteredMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMembers.map((member) => {
            const fullName = `${member.nombre || ''} ${member.apellido || ''}`.trim();
            const matricula = member.matricula || member.id || 'N/D';

            return (
              <button
                key={member.id}
                type="button"
                onClick={() =>
                  navigate(`/entrenador/rutina/${member.id}`, {
                    state: { member },
                  })
                }
                className="text-left rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-emerald-500/50 transition-colors"
              >
                <p className="text-white font-semibold hover:text-emerald-300 transition-colors">
                  {fullName || 'Sin nombre registrado'}
                </p>
                <p className="text-slate-400 text-xs mt-1">Matrícula: {matricula}</p>
                <p className="text-slate-500 text-xs mt-1">Clic para abrir/editar rutina</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
          <BitacoraEntrenador embedded />
        )}

        {currentView === 'rutinas' && (
          <RoutineManagementPanel />
        )}

        {currentView === 'desvinculacion' && (
          <TrainerClientUnlink />
        )}

        {currentView === 'dietas' && (
          <DietaRepositorio />
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

          {/* Tarjeta 5: Repositorio de Dietas */}
          <button onClick={() => setCurrentView('dietas')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-orange-500/10 rounded-lg text-orange-400 group-hover:text-orange-300 group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-orange-300 font-bold group-hover:text-white text-lg">Repositorio de Dietas</span>
                <span className="text-slate-400 text-sm hidden md:block">Planes nutricionales y archivos de dieta</span>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-orange-400 transition-transform group-hover:translate-x-1" size={24}/>
          </button>

        </div>
      </div>
    </div>
  );
}

export default TrainerManagement;