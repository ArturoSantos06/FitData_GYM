import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getAllMembers, ensureUserClaim, getCurrentUser, getUser, getUserByAuthUid, getUserByEmail } from '../../../firebase';
import { CLAVE_HIDDEN_CLIENTES, EVENTO_VISIBILIDAD_CLIENTES, filtrarClientesOcultos } from '../../../backend/visibilidadClientes';

const normalizarLlave = (valor) => String(valor || '').trim().toLowerCase();

function PanelGestionRutinas() {
  const navegar = useNavigate();
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarAlumnos = async () => {
      try {
        setCargando(true);
        setError('');

        await ensureUserClaim();
        const usuarioAuth = getCurrentUser();
        if (!usuarioAuth) throw new Error('No hay sesión activa de entrenador');

        const [resultado, asignaciones, porAuthUid, porDocId, porCorreo] = await Promise.all([
          getAllMembers(),
          getDocs(collection(db, 'client_trainer_assignments')),
          getUserByAuthUid(usuarioAuth.uid),
          getUser(usuarioAuth.uid),
          usuarioAuth.email ? getUserByEmail(usuarioAuth.email, usuarioAuth.uid) : Promise.resolve({ success: false }),
        ]);

        if (!resultado.success) throw new Error(resultado.error || 'No se pudo cargar la lista de alumnos');

        const llavesEntrenador = new Set([usuarioAuth.uid, usuarioAuth.email].map(normalizarLlave).filter(Boolean));
        [porAuthUid, porDocId, porCorreo]
          .filter((item) => item?.success && item?.data)
          .forEach((item) => [item.data.id, item.data.authUid, item.data.legacyId, item.data.email]
            .map(normalizarLlave)
            .filter(Boolean)
            .forEach((llave) => llavesEntrenador.add(llave)));

        const llavesClientesAsignados = new Set();
        asignaciones.docs.forEach((docSnap) => {
          const asignacion = docSnap.data() || {};
          const estado = String(asignacion.status || asignacion.trainerStatus || 'active').toLowerCase();
          const idEntrenador = normalizarLlave(asignacion.trainerId || asignacion.trainer_id);
          const correoEntrenador = normalizarLlave(asignacion.trainerEmail || asignacion.trainer_email);
          const correspondeEntrenador = llavesEntrenador.has(idEntrenador) || llavesEntrenador.has(correoEntrenador);
          if (!correspondeEntrenador || estado !== 'active') return;

          [asignacion.clientId, asignacion.memberId, docSnap.id]
            .map(normalizarLlave)
            .filter(Boolean)
            .forEach((llave) => llavesClientesAsignados.add(llave));
        });

        const lista = Array.isArray(resultado.data) ? resultado.data : [];
        const asignados = filtrarClientesOcultos(lista).filter((alumno) => {
          const llavesAlumno = [alumno.id, alumno.userId, alumno.authUid, alumno.email].map(normalizarLlave).filter(Boolean);
          return llavesAlumno.some((llave) => llavesClientesAsignados.has(llave));
        });

        setAlumnos(asignados);
      } catch (err) {
        setError(err.message || 'Error al cargar alumnos');
      } finally {
        setCargando(false);
      }
    };

    cargarAlumnos();

    const recargarPorVisibilidad = () => cargarAlumnos();
    window.addEventListener(EVENTO_VISIBILIDAD_CLIENTES, recargarPorVisibilidad);
    const recargarPorStorage = (event) => {
      if (event.key === CLAVE_HIDDEN_CLIENTES) cargarAlumnos();
    };
    window.addEventListener('storage', recargarPorStorage);
    return () => {
      window.removeEventListener(EVENTO_VISIBILIDAD_CLIENTES, recargarPorVisibilidad);
      window.removeEventListener('storage', recargarPorStorage);
    };
  }, []);

  const alumnosFiltrados = useMemo(() => {
    const termino = terminoBusqueda.trim().toLowerCase();
    return alumnos.filter((alumno) => {
      if (!termino) return true;
      const matricula = String(alumno.matricula || alumno.id || '').toLowerCase();
      const nombre = `${alumno.nombre || ''} ${alumno.apellido || ''}`.trim().toLowerCase();
      return matricula.includes(termino) || nombre.includes(termino);
    });
  }, [alumnos, terminoBusqueda]);

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl border-t-4 border-emerald-500 font-sans max-w-[1400px] mx-auto">
      <h3 className="text-2xl font-bold text-emerald-400 mb-6">Gestión de Rutinas</h3>
      <div className="mb-6">
        <label className="block text-sm text-slate-300 mb-2 font-medium">Buscar alumno por matrícula o nombre</label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-500" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Ej. 1024 o Juan Pérez"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pr-4 pl-10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {cargando && <div className="py-8 text-center text-slate-400 font-medium">Cargando alumnos...</div>}
      {error && !cargando && <div className="py-8 text-center text-red-400 font-medium">{error}</div>}
      {!cargando && !error && alumnosFiltrados.length === 0 && <div className="py-8 text-center text-slate-400 font-medium">No se encontraron alumnos con ese criterio.</div>}

      {!cargando && !error && alumnosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alumnosFiltrados.map((alumno) => (
            <button
              key={alumno.id}
              type="button"
              onClick={() => navegar(`/entrenador/rutina/${alumno.id}`, { state: { member: alumno } })}
              className="text-left rounded-xl border border-slate-700 bg-slate-900 p-5 hover:bg-slate-800 hover:border-emerald-500/50 transition-all shadow-md group"
            >
              <p className="text-white font-bold text-lg group-hover:text-emerald-300 transition-colors truncate">
                {`${alumno.nombre || ''} ${alumno.apellido || ''}`.trim() || 'Sin nombre registrado'}
              </p>
              <p className="text-slate-400 text-sm mt-1">Matrícula: {alumno.matricula || alumno.id || 'N/D'}</p>
              <p className="text-slate-500 text-xs mt-3 group-hover:text-emerald-500/70 transition-colors">Clic para abrir/editar rutina</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default PanelGestionRutinas;
