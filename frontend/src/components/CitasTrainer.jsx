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
    <div className={`${embedded ? 'rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:p-6' : 'min-h-screen bg-linear-to-br from-slate-950 via-[#0c1c2b] to-slate-950 p-4 md:p-8'} text-white font-sans`}>
      <header className="mb-8 border-b border-cyan-900/30 pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-linear-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent italic tracking-tighter uppercase">
          Gestión de Entrenamientos
            </h1>
            <p className="text-slate-400 mt-2 uppercase tracking-[0.28em] text-[10px] font-bold italic">FitData GYM • Planeación de sesiones</p>
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
          <div key={miembro.id} className="bg-[#122033] rounded-3xl border border-slate-800 p-6 hover:border-cyan-500/30 transition-all group shadow-lg relative">
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
            
            <h3 className="text-xl font-bold mb-1 truncate uppercase leading-none">
                {miembro.nombre} <br/> 
                <span className="text-sm opacity-60 font-medium">{miembro.apellido}</span>
            </h3>
            
            <div className="mb-8 mt-4">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-widest">
                    {miembro.edad ? `${miembro.edad} AÑOS` : "SIN EDAD"}
                </span>
            </div>
            
            <button 
              onClick={() => { setSelectedMiembro(miembro); setIsModalOpen(true); }}
              className="w-full py-4 rounded-2xl bg-linear-to-r from-cyan-500 to-blue-600 font-black text-[10px] tracking-[0.2em] uppercase transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
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
  );
};

export default CitasTrainer;