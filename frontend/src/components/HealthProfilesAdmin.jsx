import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Search, Filter } from 'lucide-react';

const normalizeText = value => String(value || '').trim().toLowerCase();

function HealthProfilesAdmin({ refreshTrigger }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    heart_condition: null,
    high_blood_pressure: null,
    recent_injuries: null,
    medications: null,
    ageMin: '',
    ageMax: ''
  });
  const [lastTrigger, setLastTrigger] = useState(refreshTrigger);

  const loadProfiles = async () => {
    console.log('📋 HealthProfilesAdmin: Cargando perfiles...');
    setLoading(true);
    setError('');
    try {
      const [profilesSnapshot, membersSnapshot] = await Promise.all([
        getDocs(collection(db, 'healthProfiles')),
        getDocs(collection(db, 'miembros'))
      ]);

      const membersById = new Map(
        membersSnapshot.docs.map(doc => [
          doc.id,
          doc.data()
        ])
      );

      const data = profilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        linkedEmail: (() => {
          const profileData = doc.data() || {};
          const linkedMember = membersById.get(String(profileData.memberId || doc.id || '').trim());
          return profileData.email || profileData.memberEmail || profileData.userEmail || profileData.cliente_email || profileData.clienteEmail || profileData.correo || linkedMember?.email || '';
        })()
      }));

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
    // Búsqueda por nombre
    if (searchTerm) {
      const term = normalizeText(searchTerm);
      const matchesSearch = normalizeText(p.memberName).includes(term) ||
                           normalizeText(p.userIdDisplay || p.id).includes(term) ||
                           normalizeText(p.username).includes(term) ||
                           normalizeText(p.email).includes(term) ||
                           normalizeText(p.memberEmail).includes(term) ||
                           normalizeText(p.userEmail).includes(term) ||
                           normalizeText(p.cliente_email).includes(term) ||
                           normalizeText(p.clienteEmail).includes(term) ||
                           normalizeText(p.correo).includes(term) ||
                           normalizeText(p.linkedEmail).includes(term);
      if (!matchesSearch) {
        return false;
      }
    }
    
    // Filtro por condición del corazón
    if (filters.heart_condition !== null && p.heart_condition !== filters.heart_condition) {
      return false;
    }
    
    // Filtro por presión alta
    if (filters.high_blood_pressure !== null && p.high_blood_pressure !== filters.high_blood_pressure) {
      return false;
    }
    
    // Filtro por lesiones recientes
    if (filters.recent_injuries !== null && p.recent_injuries !== filters.recent_injuries) {
      return false;
    }
    
    // Filtro por medicamentos
    if (filters.medications !== null && p.medications !== filters.medications) {
      return false;
    }
    
    // Filtro por edad mínima
    if (filters.ageMin && p.age < Number(filters.ageMin)) {
      return false;
    }
    
    // Filtro por edad máxima
    if (filters.ageMax && p.age > Number(filters.ageMax)) {
      return false;
    }
    
    return true;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      heart_condition: null,
      high_blood_pressure: null,
      recent_injuries: null,
      medications: null,
      ageMin: '',
      ageMax: ''
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== null && v !== '').length + (searchTerm ? 1 : 0);

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-blue-400 mb-2">Perfiles de Salud</h1>
        <p className="text-slate-400 text-sm">Gestiona y consulta los perfiles de salud de los clientes</p>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-12 gap-3">
          {/* Búsqueda por nombre */}
          <div className="col-span-12">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre, ID, usuario o correo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
              />
            </div>
          </div>

          {/* Botón de filtros */}
          <div className="col-span-12">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white font-medium text-sm transition-all"
            >
              <Filter className="w-4 h-4" />
              Filtros avanzados
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded-full text-xs font-bold">{activeFiltersCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-12 gap-3">
              {/* Rango de edad */}
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase">Edad</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Mín"
                    value={filters.ageMin}
                    onChange={e => setFilters({...filters, ageMin: e.target.value})}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Máx"
                    value={filters.ageMax}
                    onChange={e => setFilters({...filters, ageMax: e.target.value})}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Condición del corazón */}
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase">Condición del Corazón</label>
                <select
                  value={filters.heart_condition === null ? '' : filters.heart_condition}
                  onChange={e => setFilters({...filters, heart_condition: e.target.value === '' ? null : e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Presión alta */}
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase">Presión Alta</label>
                <select
                  value={filters.high_blood_pressure === null ? '' : filters.high_blood_pressure}
                  onChange={e => setFilters({...filters, high_blood_pressure: e.target.value === '' ? null : e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Lesiones recientes */}
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase">Lesiones Recientes</label>
                <select
                  value={filters.recent_injuries === null ? '' : filters.recent_injuries}
                  onChange={e => setFilters({...filters, recent_injuries: e.target.value === '' ? null : e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Medicamentos */}
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase">Medicamentos</label>
                <select
                  value={filters.medications === null ? '' : filters.medications}
                  onChange={e => setFilters({...filters, medications: e.target.value === '' ? null : e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Botón de reset */}
              <div className="col-span-12 flex gap-2">
                <button
                  onClick={resetFilters}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white font-medium text-sm transition-all"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resultados */}
      {loading && <p className="text-slate-400">Cargando...</p>}
      {error && <p className="text-red-400 mb-3">{error}</p>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No hay perfiles que coincidan con los filtros.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(p => {
          const fecha = p.updatedAt?.toDate?.() || p.createdAt?.toDate?.() || new Date();
          const fechaStr = fecha.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const condiciones = [];
          if (p.heart_condition) condiciones.push('❤️ Corazón');
          if (p.high_blood_pressure) condiciones.push('🩸 Presión');
          if (p.recent_injuries) condiciones.push('🤕 Lesiones');
          if (p.medications) condiciones.push('💊 Medicamentos');

          return (
            <div key={p.id} className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700 rounded-lg p-4 flex items-center justify-between transition-all group">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-white font-semibold text-lg">{p.memberName || 'Sin nombre'}</p>
                  {p.userIdDisplay && (
                    <span className="text-xs font-mono bg-slate-700 text-cyan-400 px-2.5 py-1 rounded-full border border-slate-600">
                      ID: {p.userIdDisplay}
                    </span>
                  )}
                  {p.age && (
                    <span className="text-xs font-semibold bg-slate-700 text-violet-300 px-2.5 py-1 rounded-full">
                      {p.age} años
                    </span>
                  )}
                </div>
                {condiciones.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {condiciones.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-red-950/40 text-red-300 rounded-full border border-red-800/30">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400">Actualizado: {fechaStr}</p>
              </div>
              <button
                onClick={() => setSelected(p)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all"
              >
                Ver Detalle
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl p-6 relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">{selected.memberName || 'Sin nombre'}</h2>
              {selected.userIdDisplay && (
                <p className="text-sm text-slate-400 mt-1 font-mono">ID: {selected.userIdDisplay}</p>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Edad</p>
                  <p className="text-white font-semibold">{selected.age ?? '—'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Condición del Corazón</p>
                  <p className="text-white font-semibold">{selected.heart_condition ? '✓ Sí' : '✗ No'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Presión Alta</p>
                  <p className="text-white font-semibold">{selected.high_blood_pressure ? '✓ Sí' : '✗ No'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Lesiones Físicas Recientes</p>
                  <p className="text-white font-semibold">{selected.recent_injuries ? '✓ Sí' : '✗ No'}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">Medicamentos</p>
                  <p className="text-white font-semibold">{selected.medications ? '✓ Sí' : '✗ No'}</p>
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2">Información adicional</p>
                <div className="bg-purple-950/40 border border-purple-700/40 rounded-lg p-3 text-purple-200 whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">{selected.additional_info || 'Sin información adicional'}</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-semibold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthProfilesAdmin;
