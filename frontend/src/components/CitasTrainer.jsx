import React, { useState, useEffect } from 'react';
import { db } from "../firebase/config";
import { collection, onSnapshot, query } from 'firebase/firestore';
import ModalExpedienteTrainer from './ModalExpedienteTrainer';
import { User, Dumbbell, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const CitasTrainer = ({ embedded = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [miembros, setMiembros] = useState([]);
  const [selectedMiembro, setSelectedMiembro] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <div className={embedded ? "" : "min-h-screen bg-slate-950 p-4 md:p-8"}>

      <div className="bg-gray-800 p-6 rounded-xl shadow-xl border-t-4 border-purple-400 text-gray-100 font-sans max-w-[1400px] mx-auto mt-6">

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {miembros.map((miembro) => (
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
                <span className="text-sm opacity-60 font-medium">{miembro.apellido}</span>
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

        {isModalOpen && (
          <ModalExpedienteTrainer
            miembro={selectedMiembro}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CitasTrainer;