import React, { useMemo, useState, useEffect } from 'react';
import { db } from "../../../firebase/config";
import { collection, onSnapshot, query } from 'firebase/firestore';
import ModalExpedienteEntrenador from '../../modales/ModalExpedienteEntrenador';
import { User, Dumbbell, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUser, getUserByAuthUid, getUserByEmail } from '../../../firebase';

const CitasEntrenador = ({ embedded = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [miembros, setMiembros] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [esModalAbierto, setEsModalAbierto] = useState(false);
  const [idsClientesAsignados, setIdsClientesAsignados] = useState([]);
  const [asignacionesLista, setAsignacionesLista] = useState(false);

  const normalizarClaveConsulta = (value) => String(value || '').trim().toLowerCase();

  const consultaClientesAsignados = useMemo(() => {
    const set = new Set();
    idsClientesAsignados.forEach((id) => {
      const normalized = normalizarClaveConsulta(id);
      if (normalized) {
        set.add(normalized);
      }
    });
    return set;
  }, [idsClientesAsignados]);

  const miembrosVisibles = useMemo(() => {
    if (!consultaClientesAsignados.size) {
      return [];
    }

    return miembros.filter((miembro) => {
      const keys = [miembro.id, miembro.userId, miembro.authUid, miembro.email];
      return keys.some((key) => consultaClientesAsignados.has(normalizarClaveConsulta(key)));
    });
  }, [miembros, consultaClientesAsignados]);

  const claseAnchoLayout = useMemo(() => {
    if (!asignacionesLista || miembrosVisibles.length === 0) {
      return 'max-w-3xl';
    }

    if (miembrosVisibles.length === 1) {
      return 'max-w-[430px]';
    }

    if (miembrosVisibles.length === 2) {
      return 'max-w-[760px]';
    }

    if (miembrosVisibles.length <= 4) {
      return 'max-w-[1080px]';
    }

    return 'max-w-[1400px]';
  }, [asignacionesLista, miembrosVisibles.length]);

  useEffect(() => {
    let desuscribirAsignaciones = null;

    const resolverClaveEntrenador = async () => {
      try {
        const usuarioFirebase = getCurrentUser();
        if (!usuarioFirebase) {
          setIdsClientesAsignados([]);
          setAsignacionesLista(true);
          return;
        }

        const porAuthUid = await getUserByAuthUid(usuarioFirebase.uid);
        const porDocId = await getUser(usuarioFirebase.uid);
        const porEmail = usuarioFirebase.email
          ? await getUserByEmail(usuarioFirebase.email, usuarioFirebase.uid)
          : { success: false };

        const candidatos = [
          porAuthUid?.success ? porAuthUid.data : null,
          porDocId?.success ? porDocId.data : null,
          porEmail?.success ? porEmail.data : null,
        ].filter(Boolean);

        const clavesEntrenador = new Set([
          usuarioFirebase.uid,
          usuarioFirebase.email,
        ].map(normalizarClaveConsulta).filter(Boolean));

        candidatos.forEach((candidato) => {
          [candidato.id, candidato.authUid, candidato.legacyId, candidato.email].forEach((clave) => {
            const normalized = normalizarClaveConsulta(clave);
            if (normalized) {
              clavesEntrenador.add(normalized);
            }
          });
        });

        const consultaAsignaciones = query(collection(db, 'client_trainer_assignments'));
        desuscribirAsignaciones = onSnapshot(consultaAsignaciones, (snapshot) => {
          const idsClientesSiguientes = new Set();

          snapshot.docs.forEach((docSnap) => {
            const asignacion = docSnap.data() || {};
            const estado = String(asignacion.status || asignacion.trainerStatus || 'active').toLowerCase();
            const idEntrenadorAsignacion = normalizarClaveConsulta(asignacion.trainerId || asignacion.trainer_id);
            const emailEntrenadorAsignacion = normalizarClaveConsulta(asignacion.trainerEmail || asignacion.trainer_email);
            const coincideEntrenador =
              clavesEntrenador.has(idEntrenadorAsignacion)
              || clavesEntrenador.has(emailEntrenadorAsignacion);

            if (!coincideEntrenador || estado !== 'active') {
              return;
            }

            const idCliente = String(asignacion.clientId || asignacion.memberId || docSnap.id || '').trim();
            if (idCliente) {
              idsClientesSiguientes.add(idCliente);
            }
          });

          setIdsClientesAsignados(Array.from(idsClientesSiguientes));
          setAsignacionesLista(true);
        }, (error) => {
          console.error('Error al cargar asignaciones del entrenador:', error);
          setIdsClientesAsignados([]);
          setAsignacionesLista(true);
        });
      } catch (error) {
        console.error('Error al resolver datos del entrenador autenticado:', error);
        setIdsClientesAsignados([]);
        setAsignacionesLista(true);
      }
    };

    resolverClaveEntrenador();

    return () => {
      if (typeof desuscribirAsignaciones === 'function') {
        desuscribirAsignaciones();
      }
    };
  }, []);

  useEffect(() => {
    const consultaMiembros = query(collection(db, "miembros"));
    const consultaSalud = query(collection(db, "healthProfiles"));
    let miembrosActuales = [];
    let mapaSaludActual = {};

    const combinarDatos = () => {
      if (miembrosActuales.length === 0) return;
      const finales = miembrosActuales.map(m => {
        const colorBase = m.avatarColor || '#06b6d4';
        const colorHex = colorBase.startsWith('#') ? colorBase : `#${colorBase}`;
        return {
          ...m,
          edad: mapaSaludActual[m.id]?.age || mapaSaludActual[m.userId]?.age || null,
          colorMostrado: colorHex
        };
      });
      setMiembros(finales);
    };

    const desuscribirMiembros = onSnapshot(consultaMiembros, (snapM) => {
      miembrosActuales = snapM.docs.map(d => ({ id: d.id, ...d.data() }));
      combinarDatos();
    });

    const desuscribirSalud = onSnapshot(consultaSalud, (snapS) => {
      const mapaS = {};
      snapS.docs.forEach(d => { mapaS[d.data().userId || d.id] = d.data(); });
      mapaSaludActual = mapaS;
      combinarDatos();
    });

    return () => { desuscribirMiembros(); desuscribirSalud(); };
  }, []);

  const rutaAtras = location.pathname.startsWith('/entrenador') ? '/entrenador' : '/admin';

  return (
    <div className={embedded ? '' : 'min-h-screen bg-slate-950 p-4 md:p-8'}>
      <div className={`mx-auto mt-6 w-full ${claseAnchoLayout} rounded-[28px] border border-slate-800/80 bg-linear-to-br from-[#0f172a] via-[#0c1a37] to-[#0a1430] p-5 md:p-8 shadow-[0_18px_55px_rgba(2,10,28,0.45)] transition-all duration-300`}>

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
                onClick={() => navigate(rutaAtras)}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-cyan-800/40 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-cyan-200 hover:border-cyan-500/50 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
            )}
          </div>
        </header>

        {!asignacionesLista ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-8 text-center text-slate-300">
            Cargando clientes asignados...
          </div>
        ) : miembrosVisibles.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-8 text-center text-slate-300">
            No tienes clientes asignados en este momento.
          </div>
        ) : (
        <div className="grid gap-6 justify-center grid-cols-[repeat(auto-fit,minmax(260px,320px))]">
          {miembrosVisibles.map((miembro) => (
            <div key={miembro.id} className="bg-[#122033] rounded-3xl border border-slate-800 p-6 hover:border-cyan-500/30 transition-all group shadow-lg relative flex flex-col h-full min-h-[260px]">
              <div className="absolute top-4 right-6">
                <span className="text-[11px] font-mono font-black text-cyan-300 block uppercase">
                  ID: {miembro.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-start mb-6 pt-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl" style={{ backgroundColor: miembro.colorMostrado }}>
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
                onClick={() => { setMiembroSeleccionado(miembro); setEsModalAbierto(true); }}
                className="mt-auto w-full py-4 rounded-2xl bg-linear-to-r from-purple-500 to-blue-400 font-black text-[10px] tracking-[0.2em] uppercase transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              >
                PLANIFICAR <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
        )}

        {esModalAbierto && (
          <ModalExpedienteEntrenador
            miembro={miembroSeleccionado}
            onClose={() => setEsModalAbierto(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CitasEntrenador;
