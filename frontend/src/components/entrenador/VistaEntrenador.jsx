import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ArrowLeft, LogOut, CalendarDays, NotebookPen } from 'lucide-react';
import { getAllMembers, logoutUser, ensureUserClaim } from '../../firebase';

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

        await ensureUserClaim();

        const result = await getAllMembers();
        if (!result.success) {
          throw new Error(result.error || 'No se pudo cargar la lista de alumnos asignados');
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <button
              type="button"
              onClick={async () => {
                localStorage.removeItem('trainer_token');
                localStorage.removeItem('trainer_username');
                await logoutUser();
                navigate('/entrenador/login');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-300 transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => navigate('/entrenador/citas')}
            className="rounded-2xl border border-cyan-800/40 bg-linear-to-r from-slate-900 to-[#10253b] p-5 text-left hover:border-cyan-500/50 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-bold mb-2">Agenda</p>
                <h2 className="text-xl font-bold text-white">Citas Entrenador</h2>
                <p className="text-sm text-slate-400 mt-2">Organiza sesiones y abre expedientes de entrenamiento.</p>
              </div>
              <CalendarDays className="text-cyan-400" size={28} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/entrenador/bitacora')}
            className="rounded-2xl border border-blue-800/40 bg-linear-to-r from-slate-900 to-[#1a2340] p-5 text-left hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-300 font-bold mb-2">Seguimiento</p>
                <h2 className="text-xl font-bold text-white">Bitácora Entrenador</h2>
                <p className="text-sm text-slate-400 mt-2">Guarda notas privadas y seguimiento de cada alumno.</p>
              </div>
              <NotebookPen className="text-blue-400" size={28} />
            </div>
          </button>
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
                    <p
                      onClick={() =>
                        navigate(`/entrenador/rutina/${member.id}`, {
                          state: { member }
                        })
                      }
                      className="text-white font-semibold cursor-pointer select-none hover:text-blue-400 transition-colors"
                      title="Clic para abrir rutina"
                    >
                      {fullName || 'Sin nombre registrado'}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Matrícula: {matricula}</p>
                    <p className="text-slate-500 text-xs mt-1">Clic en el nombre para crear rutina</p>
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