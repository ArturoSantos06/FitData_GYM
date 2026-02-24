import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

function HealthProfilesAdmin({ refreshTrigger }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [lastTrigger, setLastTrigger] = useState(refreshTrigger);

  const loadProfiles = async () => {
    console.log('📋 HealthProfilesAdmin: Cargando perfiles...');
    setLoading(true);
    setError('');
    try {
      const querySnapshot = await getDocs(collection(db, 'healthProfiles'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('✅ Perfiles cargados:', data.length);
      setProfiles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Componente montado, cargando perfiles iniciales');
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
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-blue-400 mb-4">Perfiles de Salud</h1>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filter}
          onChange={e=>setFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
        />
      </div>
      {loading && <p className="text-slate-400">Cargando...</p>}
      {error && <p className="text-red-400 mb-3">{error}</p>}
      {!loading && filtered.length === 0 && <p className="text-slate-500">Sin perfiles.</p>}
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{p.memberName}</p>
              <p className="text-xs text-slate-400">Actualizado: {new Date(p.createdAt?.toDate?.() || new Date()).toLocaleString()}</p>
            </div>
            <button
              onClick={()=>setSelected(p)}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
            >Ver Detalle</button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl p-6 relative">
            <button
              onClick={()=>setSelected(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >✕</button>
            <h2 className="text-xl font-bold text-white mb-4">Ficha Salud: {selected.memberName}</h2>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Edad</p>
                  <p className="text-white font-semibold">{selected.age ?? '—'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Condición del Corazón</p>
                  <p className="text-white font-semibold">{selected.heart_condition ? 'Sí' : 'No'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Presión Alta</p>
                  <p className="text-white font-semibold">{selected.high_blood_pressure ? 'Sí' : 'No'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Lesiones Físicas Recientes</p>
                  <p className="text-white font-semibold">{selected.recent_injuries ? 'Sí' : 'No'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Medicamentos</p>
                  <p className="text-white font-semibold">{selected.medications ? 'Sí' : 'No'}</p>
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2">Información adicional</p>
                <div className="bg-purple-950/40 border border-purple-700/40 rounded-lg p-3 text-purple-200 whitespace-pre-wrap">{selected.additional_info || 'Sin información adicional'}</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={()=>setSelected(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-semibold"
              >Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthProfilesAdmin;
