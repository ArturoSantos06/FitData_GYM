import React, { useMemo, useState, useEffect } from 'react';
import { db } from "../firebase/config";
import { collection, onSnapshot, query } from 'firebase/firestore';
import ModalExpedienteEntrenador from './modales/ModalExpedienteEntrenador';
import { User, Dumbbell, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUser, getUserByAuthUid, getUserByEmail } from '../firebase';

const CitasTrainer = ({ embedded = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [miembros, setMiembros] = useState([]);
  const [selectedMiembro, setSelectedMiembro] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignedClientIds, setAssignedClientIds] = useState([]);
  const [assignmentsReady, setAssignmentsReady] = useState(false);

  const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();

  const assignedLookup = useMemo(() => {
    const set = new Set();
    assignedClientIds.forEach((id) => {
      const normalized = normalizeLookupKey(id);
      if (normalized) {
        set.add(normalized);
      }
    });
    return set;
  }, [assignedClientIds]);

  const visibleMiembros = useMemo(() => {
    if (!assignedLookup.size) {
      return [];
    }

    return miembros.filter((miembro) => {
      const keys = [miembro.id, miembro.userId, miembro.authUid, miembro.email];
      return keys.some((key) => assignedLookup.has(normalizeLookupKey(key)));
    });
  }, [miembros, assignedLookup]);

  const layoutWidthClass = useMemo(() => {
    if (!assignmentsReady || visibleMiembros.length === 0) {
      return 'max-w-3xl';
    }

    if (visibleMiembros.length === 1) {
      return 'max-w-[430px]';
    }

    if (visibleMiembros.length === 2) {
      return 'max-w-[760px]';
    }

    if (visibleMiembros.length <= 4) {
      return 'max-w-[1080px]';
    }

    return 'max-w-[1400px]';
  }, [assignmentsReady, visibleMiembros.length]);

  useEffect(() => {
    let unsubscribeAssignments = null;

    const resolveTrainerKeys = async () => {
      try {
        const firebaseUser = getCurrentUser();
        if (!firebaseUser) {
          setAssignedClientIds([]);
          setAssignmentsReady(true);
          return;
        }

        const byAuthUid = await getUserByAuthUid(firebaseUser.uid);
        const byDocId = await getUser(firebaseUser.uid);
        const byEmail = firebaseUser.email
          ? await getUserByEmail(firebaseUser.email, firebaseUser.uid)
          : { success: false };

        const candidates = [
          byAuthUid?.success ? byAuthUid.data : null,
          byDocId?.success ? byDocId.data : null,
          byEmail?.success ? byEmail.data : null,
        ].filter(Boolean);

        const trainerKeys = new Set([
          firebaseUser.uid,
          firebaseUser.email,
        ].map(normalizeLookupKey).filter(Boolean));

        candidates.forEach((candidate) => {
          [candidate.id, candidate.authUid, candidate.legacyId, candidate.email].forEach((key) => {
            const normalized = normalizeLookupKey(key);
            if (normalized) {
              trainerKeys.add(normalized);
            }
          });
        });

        const assignmentsQuery = query(collection(db, 'client_trainer_assignments'));
        unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
          const nextClientIds = new Set();

          snapshot.docs.forEach((docSnap) => {
            const assignment = docSnap.data() || {};
            const status = String(assignment.status || assignment.trainerStatus || 'active').toLowerCase();
            const assignmentTrainerId = normalizeLookupKey(assignment.trainerId || assignment.trainer_id);
            const assignmentTrainerEmail = normalizeLookupKey(assignment.trainerEmail || assignment.trainer_email);
            const matchesTrainer =
              trainerKeys.has(assignmentTrainerId)
              || trainerKeys.has(assignmentTrainerEmail);

            if (!matchesTrainer || status !== 'active') {
              return;
            }

            const clientId = String(assignment.clientId || assignment.memberId || docSnap.id || '').trim();
            if (clientId) {
              nextClientIds.add(clientId);
            }
          });

          setAssignedClientIds(Array.from(nextClientIds));
          setAssignmentsReady(true);
        }, (error) => {
          console.error('Error al cargar asignaciones del entrenador:', error);
          setAssignedClientIds([]);
          setAssignmentsReady(true);
        });
      } catch (error) {
        console.error('Error al resolver datos del entrenador autenticado:', error);
        setAssignedClientIds([]);
        setAssignmentsReady(true);
      }
    };

    resolveTrainerKeys();

    return () => {
      if (typeof unsubscribeAssignments === 'function') {
        unsubscribeAssignments();
      }
    };
  }, []);

  useEffect(() => {
    const qMiembros = query(collection(db, "miembros"));
    const qSalud = query(collection(db, "healthProfiles"));
    let currentMiembros = [];
    let currentSaludMap = {};

    const combinarDatos = () => {
      if (currentMiembros.length === 0) return;
      const finales = currentMiembros.map(m => {
        const colorBase = m.avatarColor || '#06b6d4';
        const colorHex = colorBase.startsWith('#') ? colorBase : `#${colorBase}`;
        return {
          ...m,
          edad: currentSaludMap[m.id]?.age || currentSaludMap[m.userId]?.age || null,
          displayColor: colorHex
        };
      });
      setMiembros(finales);
    };

    const unsubMiembros = onSnapshot(qMiembros, (snapM) => {
      currentMiembros = snapM.docs.map(d => ({ id: d.id, ...d.data() }));
      combinarDatos();
    });

    const unsubSalud = onSnapshot(qSalud, (snapS) => {
      const saludMap = {};
      snapS.docs.forEach(d => { saludMap[d.data().userId || d.id] = d.data(); });
      currentSaludMap = saludMap;
      combinarDatos();
    });

    return () => { unsubMiembros(); unsubSalud(); };
  }, []);

  const backPath = location.pathname.startsWith('/entrenador') ? '/entrenador' : '/admin';

  return (
    <div className={embedded ? '' : 'min-h-screen bg-slate-950 p-4 md:p-8'}>
      <div className={`mx-auto mt-6 w-full ${layoutWidthClass} rounded-[28px] border border-slate-800/80 bg-linear-to-br from-[#0f172a] via-[#0c1a37] to-[#0a1430] p-5 md:p-8 shadow-[0_18px_55px_rgba(2,10,28,0.45)] transition-all duration-300`}>

        <header className="mb-8 border-b border-cyan-900/30 pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-br from-blue-400 to-purple-400 pb-1.5">
                Agenda de Sesiones
              </h2>
              <p className="text-slate-400 font-medium mt-1.5">Planeación de sesiones</p>
            </div>
            {!embedded && (
              <button
                type="button"
                onClick={() => navigate(backPath)}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-cyan-800/40 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-cyan-200 hover:border-cyan-500/50 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
            )}
          </div>
        </header>

        {!assignmentsReady ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-8 text-center text-slate-300">
            Cargando clientes asignados...
          </div>
        ) : visibleMiembros.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-8 text-center text-slate-300">
            No tienes clientes asignados en este momento.
          </div>
        ) : (
        <div className="grid gap-6 justify-center grid-cols-[repeat(auto-fit,minmax(260px,320px))]">
          {visibleMiembros.map((miembro) => (
            <div key={miembro.id} className="bg-[#122033] rounded-3xl border border-slate-800 p-6 hover:border-cyan-500/30 transition-all group shadow-lg relative flex flex-col h-full min-h-[260px]">
              <div className="absolute top-4 right-6">
                <span className="text-[11px] font-mono font-black text-cyan-300 block uppercase">
                  ID: {miembro.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-start mb-6 pt-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl" style={{ backgroundColor: miembro.displayColor }}>
                  <User size={28} strokeWidth={2.5} />
                </div>
                <Dumbbell size={22} className="text-slate-700 group-hover:text-cyan-400/60 transition-colors" />
              </div>

              <h3 className="text-xl font-bold mb-1 truncate uppercase leading-none flex-1">
                {miembro.nombre} <br />
                <span className="text-sm opacity-60 font-medium">
                  {miembro.apellido ? `${miembro.apellido}` : "SIN APELLIDO"}
                </span>
              </h3>

              <div className="mb-6 mt-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-widest">
                  {miembro.edad ? `${miembro.edad} AÑOS` : "SIN EDAD"}
                </span>
              </div>

              <button
                onClick={() => { setSelectedMiembro(miembro); setIsModalOpen(true); }}
                className="mt-auto w-full py-4 rounded-2xl bg-linear-to-r from-purple-500 to-blue-400 font-black text-[10px] tracking-[0.2em] uppercase transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              >
                PLANIFICAR <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
        )}

        {isModalOpen && (
          <ModalExpedienteEntrenador
            miembro={selectedMiembro}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CitasTrainer;