import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function VistaEntrenador() {
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

        const response = await fetch(`${API_URL}/api/miembros/`);
        if (!response.ok) {
          throw new Error('No se pudo cargar la lista de alumnos asignados');
        }

        const data = await response.json();
        setMembers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Error al cargar alumnos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const assignedMembers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return members.filter((member) => {
      const matricula = String(member.matricula || member.id || '').toLowerCase();
      const fullName = `${member.nombre || ''} ${member.apellido || ''}`.trim().toLowerCase();

      if (!normalized) return true;
      return matricula.includes(normalized) || fullName.includes(normalized);
    });
  }, [members, searchTerm]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold">Portal de Entrenador</h1>
            <p className="text-slate-400 text-sm">Alumnos asignados</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6">
          <label className="block text-sm text-slate-300 mb-2">
            Buscar por matrícula o nombre completo
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ej. 1024 o Juan Pérez"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Users size={18} />
              Lista de asignados
            </div>
            <span className="text-xs md:text-sm text-slate-400">
              {assignedMembers.length} alumno(s)
            </span>
          </div>

          {isLoading && <div className="py-10 text-center text-slate-400">Cargando alumnos...</div>}
          {error && !isLoading && <div className="py-10 text-center text-red-400">{error}</div>}

          {!isLoading && !error && assignedMembers.length === 0 && (
            <div className="py-10 text-center text-slate-400">
              No se encontraron alumnos con ese criterio.
            </div>
          )}

          {!isLoading && !error && assignedMembers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedMembers.map((member) => {
                const fullName = `${member.nombre || ''} ${member.apellido || ''}`.trim();
                const matricula = member.matricula || member.id || 'N/D';

                return (
                  <div key={member.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-white font-semibold">{fullName || 'Sin nombre registrado'}</p>
                    <p className="text-slate-400 text-sm mt-1">Matrícula: {matricula}</p>
                    {member.email && <p className="text-slate-500 text-xs mt-1">{member.email}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VistaEntrenador;