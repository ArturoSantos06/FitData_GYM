import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getCurrentUser, getUser, getUserByAuthUid, getUserByEmail } from '../../../firebase';

const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();

function HealthProfilesCoach({ refreshTrigger }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [lastTrigger, setLastTrigger] = useState(refreshTrigger);

  const loadProfiles = async () => {
    console.log('📋 HealthProfilesCoach: Cargando perfiles...');
    setLoading(true);
    setError('');
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const [assignmentsSnapshot, querySnapshot, membersSnapshot, byAuthUid, byDocId, byEmail] = await Promise.all([
        getDocs(collection(db, 'client_trainer_assignments')),
        getDocs(collection(db, 'healthProfiles')),
        getDocs(collection(db, 'miembros')),
        getUserByAuthUid(currentUser.uid),
        getUser(currentUser.uid),
        currentUser.email ? getUserByEmail(currentUser.email, currentUser.uid) : Promise.resolve({ success: false }),
      ]);

      const trainerKeys = new Set([
        currentUser.uid,
        currentUser.email,
      ].map(normalizeLookupKey).filter(Boolean));

      [byAuthUid, byDocId, byEmail]
        .filter((result) => result?.success && result?.data)
        .forEach((result) => {
          const data = result.data;
          [data.id, data.authUid, data.legacyId, data.email].forEach((key) => {
            const normalized = normalizeLookupKey(key);
            if (normalized) {
              trainerKeys.add(normalized);
            }
          });
        });

      const assignedClientKeys = new Set();
      const assignedClientNames = new Set();
      assignmentsSnapshot.docs.forEach((docSnap) => {
        const assignment = docSnap.data() || {};
        const status = String(assignment.status || assignment.trainerStatus || 'active').toLowerCase();
        const assignmentTrainerId = normalizeLookupKey(assignment.trainerId || assignment.trainer_id);
        const assignmentTrainerEmail = normalizeLookupKey(assignment.trainerEmail || assignment.trainer_email);
        const matchesTrainer = trainerKeys.has(assignmentTrainerId) || trainerKeys.has(assignmentTrainerEmail);

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

      membersSnapshot.docs.forEach((memberDoc) => {
        const memberData = memberDoc.data() || {};
        const memberKeys = [
          memberDoc.id,
          memberData.userId,
          memberData.authUid,
          memberData.email,
        ].map(normalizeLookupKey).filter(Boolean);

        const memberNames = [
          `${memberData.nombre || ''} ${memberData.apellido || ''}`.trim(),
          `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim(),
          memberData.displayName,
          memberData.username,
        ].map(normalizeLookupKey).filter(Boolean);

        const matchesAssignment = memberKeys.some((key) => assignedClientKeys.has(key));
        if (matchesAssignment) {
          memberNames.forEach((name) => assignedClientNames.add(name));
        }
      });

      const memberLookup = new Map();
      const memberNameLookup = new Map();
      membersSnapshot.docs.forEach((memberDoc) => {
        const memberData = memberDoc.data() || {};
        const memberRecord = {
          id: memberDoc.id,
          ...memberData,
        };

        [
          memberDoc.id,
          memberData.userId,
          memberData.authUid,
          memberData.email,
        ].forEach((key) => {
          const normalized = normalizeLookupKey(key);
          if (normalized) {
            memberLookup.set(normalized, memberRecord);
          }
        });

        const memberNames = [
          `${memberData.nombre || ''} ${memberData.apellido || ''}`.trim(),
          `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim(),
          memberData.displayName,
          memberData.username,
        ];

        memberNames.forEach((nameValue) => {
          const normalizedMemberName = normalizeLookupKey(nameValue);
          if (normalizedMemberName) {
            memberNameLookup.set(normalizedMemberName, memberRecord);
          }
        });
      });

      const profilesByMemberKey = new Map();
      querySnapshot.docs.forEach((docSnap) => {
        const profile = {
          id: docSnap.id,
          ...docSnap.data(),
        };

        const profileKeys = [
          profile.id,
          profile.memberId,
          profile.userId,
          profile.userIdDisplay,
          profile.memberAuthUid,
          profile.memberEmail,
          profile.userEmail,
          profile.email,
        ].map(normalizeLookupKey).filter(Boolean);

        profileKeys.forEach((key) => {
          if (!profilesByMemberKey.has(key)) {
            profilesByMemberKey.set(key, profile);
          }
        });
      });

      const assignedMembers = [];
      membersSnapshot.docs.forEach((memberDoc) => {
        const memberData = memberDoc.data() || {};
        const memberKeys = [
          memberDoc.id,
          memberData.userId,
          memberData.authUid,
          memberData.email,
        ].map(normalizeLookupKey).filter(Boolean);

        const memberNames = [
          `${memberData.nombre || ''} ${memberData.apellido || ''}`.trim(),
          `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim(),
          memberData.displayName,
          memberData.username,
        ].map(normalizeLookupKey).filter(Boolean);

        const matchesAssignment = memberKeys.some((key) => assignedClientKeys.has(key)) || memberNames.some((name) => assignedClientNames.has(name));
        if (matchesAssignment) {
          assignedMembers.push({
            id: memberDoc.id,
            ...memberData,
          });
        }
      });

      const assignedProfiles = assignedMembers
        .map((member) => {
          const memberNames = [
            `${member.nombre || ''} ${member.apellido || ''}`.trim(),
            `${member.firstName || ''} ${member.lastName || ''}`.trim(),
            member.displayName,
            member.username,
          ].map(normalizeLookupKey).filter(Boolean);

          const memberKeys = [
            member.id,
            member.userId,
            member.authUid,
            member.email,
          ].map(normalizeLookupKey).filter(Boolean);

          const profileMatch = [...memberKeys, ...memberNames]
            .map((key) => profilesByMemberKey.get(key))
            .find(Boolean);

          if (!profileMatch) {
            return null;
          }

          return {
            ...member,
            ...profileMatch,
            id: profileMatch.id,
            memberName: profileMatch.memberName || `${member.nombre || ''} ${member.apellido || ''}`.trim() || member.displayName || member.username || 'Sin nombre',
            userIdDisplay: profileMatch.userIdDisplay || member.id || member.userId || '',
          };
        })
        .filter(Boolean);

      setProfiles(assignedProfiles);
    } catch (err) {
      console.error('❌ Error en loadProfiles:', err);
      setError("Error al conectar con la base de datos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Componente Coach montado, cargando perfiles iniciales');
    loadProfiles();
  }, []);

  useEffect(() => {
    if (refreshTrigger !== lastTrigger) {
      console.log('🔔 refreshTrigger cambió de', lastTrigger, 'a', refreshTrigger);
      setLastTrigger(refreshTrigger);
      loadProfiles();
    }
  }, [refreshTrigger, lastTrigger]);

  const filtered = profiles.filter(p => {
    if (!filter) return true;
    return (p.memberName || '').toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="w-full animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl border-t-4 border-blue-500 text-gray-100 font-sans max-w-[1400px] mx-auto">
        <header className="mb-6 border-b border-gray-700 pb-5">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-sky-300 to-blue-500">
            Fichas Medicas de Clientes
          </h1>
          <p className="text-slate-400 font-medium mt-1.5">Consulta rapida del historial medico de tus clientes asignados</p>
        </header>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar cliente por nombre..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full md:w-[320px] bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none"
          />
        </div>

        {loading && <p className="text-slate-400 italic">Consultando expedientes...</p>}
        {error && <p className="text-red-400 mb-3 bg-red-900/20 p-3 rounded-lg border border-red-800">{error}</p>}
        {!loading && filtered.length === 0 && <p className="text-slate-500">No se encontraron registros.</p>}

        <div className="space-y-2">
        {filtered.map(p => {
          // Lógica de fecha igual a la vista de Admin
          const fecha = p.updatedAt?.toDate?.() || p.createdAt?.toDate?.() || new Date();
          const fechaStr = fecha.toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div key={p.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-blue-500/50 hover:bg-slate-800 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-white font-semibold truncate">{p.memberName || 'Sin nombre'}</p>
                  {p.userIdDisplay && (
                    <span className="inline-flex shrink-0 text-[11px] font-mono bg-slate-700 text-cyan-400 px-2 py-0.5 rounded border border-slate-600">
                      ID: {p.userIdDisplay}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="text-[11px] text-slate-400">Actualizado: {fechaStr}</p>
                  {(p.recent_injuries || p.heart_condition) && (
                    <span className="px-2 py-0.5 bg-red-900/50 text-red-300 text-[10px] rounded-full font-medium border border-red-800/50 uppercase">
                      ⚠️ Atención
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(p)}
                className="w-full sm:w-auto px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20"
              >
                Ver Ficha
              </button>
            </div>
          );
        })}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl p-6 relative shadow-2xl">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-xl"
            >✕</button>
            
            <div className="mb-6 border-b border-slate-700 pb-2">
              <h2 className="text-xl font-bold text-white">Cliente: {selected.memberName}</h2>
              {selected.userIdDisplay && (
                <p className="text-xs text-cyan-400 font-mono mt-1">Expediente ID: {selected.userIdDisplay}</p>
              )}
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 border ${selected.recent_injuries ? 'bg-red-900/30 border-red-500' : 'bg-slate-800 border-transparent'}`}>
                  <p className="text-slate-400 text-xs">Lesiones Recientes</p>
                  <p className={`font-bold text-lg ${selected.recent_injuries ? 'text-red-400' : 'text-white'}`}>
                    {selected.recent_injuries ? 'SÍ' : 'NO'}
                  </p>
                </div>
                <div className={`rounded-lg p-3 border ${selected.heart_condition ? 'bg-red-900/30 border-red-500' : 'bg-slate-800 border-transparent'}`}>
                  <p className="text-slate-400 text-xs">Condición Cardíaca</p>
                  <p className={`font-bold text-lg ${selected.heart_condition ? 'text-red-400' : 'text-white'}`}>
                    {selected.heart_condition ? 'SÍ' : 'NO'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Edad</p>
                  <p className="text-white font-semibold text-lg">{selected.age ?? selected.edad ?? '—'}</p>
                </div>
                <div className={`rounded-lg p-3 border ${selected.high_blood_pressure ? 'bg-orange-900/20 border-orange-800' : 'bg-slate-800 border-transparent'}`}>
                  <p className="text-slate-400 text-xs">Presión Alta</p>
                  <p className="text-white font-semibold text-lg">{selected.high_blood_pressure ? 'Sí' : 'No'}</p>
                </div>
                <div className={`rounded-lg p-3 border ${selected.medications ? 'bg-yellow-900/20 border-yellow-800' : 'bg-slate-800 border-transparent'}`}>
                  <p className="text-slate-400 text-xs">Medicado</p>
                  <p className="text-white font-semibold text-lg">{selected.medications ? 'Sí' : 'No'}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-2">Notas del Cliente</p>
                <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-3 text-blue-100 whitespace-pre-wrap min-h-20">
                  {selected.additional_info || 'Sin observaciones adicionales.'}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 italic">
                Última sincronización: {new Date().toLocaleTimeString()}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-bold transition-colors"
              >
                Cerrar ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthProfilesCoach;
