import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, StickyNote, Dumbbell, UserMinus, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getAllMembers, ensureUserClaim, getCurrentUser, getUser, getUserByAuthUid, getUserByEmail } from '../../firebase';

import TrainerClientUnlink from '../TrainerClientUnlink';
import BitacoraEntrenador from './BitacoraEntrenador';
import HealthProfilesCoach from '../HealthProfilesCoach';

const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();

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
        const authUser = getCurrentUser();
        if (!authUser) {
          throw new Error('No hay sesión activa de entrenador');
        }

        const [result, assignmentsSnapshot, byAuthUid, byDocId, byEmail] = await Promise.all([
          getAllMembers(),
          getDocs(collection(db, 'client_trainer_assignments')),
          getUserByAuthUid(authUser.uid),
          getUser(authUser.uid),
          authUser.email ? getUserByEmail(authUser.email, authUser.uid) : Promise.resolve({ success: false }),
        ]);

        if (!result.success) {
          throw new Error(result.error || 'No se pudo cargar la lista de alumnos');
        }

        const trainerKeys = new Set([
          authUser.uid,
          authUser.email,
        ].map(normalizeLookupKey).filter(Boolean));

        [byAuthUid, byDocId, byEmail]
          .filter((entry) => entry?.success && entry?.data)
          .forEach((entry) => {
            const data = entry.data;
            [data.id, data.authUid, data.legacyId, data.email].forEach((key) => {
              const normalized = normalizeLookupKey(key);
              if (normalized) {
                trainerKeys.add(normalized);
              }
            });
          });

        const assignedClientKeys = new Set();
        assignmentsSnapshot.docs.forEach((docSnap) => {
          const assignment = docSnap.data() || {};
          const status = String(assignment.status || assignment.trainerStatus || 'active').toLowerCase();
          const trainerId = normalizeLookupKey(assignment.trainerId || assignment.trainer_id);
          const trainerEmail = normalizeLookupKey(assignment.trainerEmail || assignment.trainer_email);
          const matchesTrainer = trainerKeys.has(trainerId) || trainerKeys.has(trainerEmail);

          if (!matchesTrainer || status !== 'active') {
            return;
          }

          [assignment.clientId, assignment.memberId, docSnap.id].forEach((key) => {
            const normalized = normalizeLookupKey(key);
            if (normalized) {
              assignedClientKeys.add(normalized);
            }
          });
        });

        const allMembers = Array.isArray(result.data) ? result.data : [];
        const assignedMembers = allMembers.filter((member) => {
          const memberKeys = [member.id, member.userId, member.authUid, member.email]
            .map(normalizeLookupKey)
            .filter(Boolean);
          return memberKeys.some((key) => assignedClientKeys.has(key));
        });

        setMembers(assignedMembers);
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
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl border-t-4 border-emerald-500 font-sans max-w-[1400px] mx-auto">
      <h3 className="text-2xl font-bold text-emerald-400 mb-6">Gestión de Rutinas</h3>

      <div className="mb-6">
        <label className="block text-sm text-slate-300 mb-2 font-medium">Buscar alumno por matrícula o nombre</label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ej. 1024 o Juan Pérez"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pr-4 pl-10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {isLoading && <div className="py-8 text-center text-slate-400 font-medium">Cargando alumnos...</div>}
      {error && !isLoading && <div className="py-8 text-center text-red-400 font-medium">{error}</div>}

      {!isLoading && !error && filteredMembers.length === 0 && (
        <div className="py-8 text-center text-slate-400 font-medium">No se encontraron alumnos con ese criterio.</div>
      )}

      {!isLoading && !error && filteredMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="text-left rounded-xl border border-slate-700 bg-slate-900 p-5 hover:bg-slate-800 hover:border-emerald-500/50 transition-all shadow-md group"
              >
                <p className="text-white font-bold text-lg group-hover:text-emerald-300 transition-colors truncate">
                  {fullName || 'Sin nombre registrado'}
                </p>
                <p className="text-slate-400 text-sm mt-1">Matrícula: {matricula}</p>
                <p className="text-slate-500 text-xs mt-3 group-hover:text-emerald-500/70 transition-colors">
                  Clic para abrir/editar rutina
                </p>
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

        {currentView === 'historial' && (
          <HealthProfilesCoach />
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
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-teal-400 via-blue-400 to-purple-400"></div>

        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-400 via-blue-400 to-purple-400">Herramientas de Gestión</h2>
          <p className="text-slate-400 font-medium mt-1.5">Selecciona la acción que deseas realizar con tus clientes.</p>
        </div>

        <div className="space-y-3">
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
            <ChevronRight className="text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" size={24} />
          </button>

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
            <ChevronRight className="text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-1" size={24} />
          </button>

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
            <ChevronRight className="text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1" size={24} />
          </button>

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
            <ChevronRight className="text-slate-500 group-hover:text-red-400 transition-transform group-hover:translate-x-1" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrainerManagement;