import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

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
      const querySnapshot = await getDocs(collection(db, 'healthProfiles'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProfiles(data);
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
    <div className="w-full max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-blue-400 mb-4">
        Fichas Médicas de Clientes
      </h1>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar cliente por nombre..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none w-full sm:w-auto"
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
            <div key={p.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">{p.memberName || 'Sin nombre'}</p>
                  {p.userIdDisplay && (
                    <span className="text-xs font-mono bg-slate-700 text-cyan-400 px-2 py-0.5 rounded border border-slate-600">
                      ID: {p.userIdDisplay}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
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
                className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-purple-900/20"
              >
                Ver Ficha
              </button>
            </div>
          );
        })}
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
                  <p className="text-white font-semibold text-lg">{selected.age ?? '—'}</p>
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
                <div className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-3 text-purple-100 whitespace-pre-wrap min-h-[80px]">
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


//http://localhost:5173/admin/fichas-medicas-coach