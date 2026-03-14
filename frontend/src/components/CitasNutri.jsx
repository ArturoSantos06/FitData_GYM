import React, { useState, useEffect } from 'react';
import { db } from "../firebase/config"; 
import { collection, onSnapshot, query } from 'firebase/firestore';
import ModalExpedienteNutri from './ModalExpedienteNutri';
import { User, Activity, ChevronRight } from 'lucide-react';

const CitasNutri = () => {
  const [miembros, setMiembros] = useState([]);
  const [selectedMiembro, setSelectedMiembro] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [citas, setCitas] = useState([]);

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

  useEffect(() => {
    const q = query(collection(db, "citas"));
    const unsubCitas = onSnapshot(q, (snap) => {
      setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubCitas();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8 font-sans">
      <header className="mb-10 border-b border-slate-800 pb-6">
        <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent italic tracking-tighter uppercase">
          Gestión de Nutrición
        </h1>
        <p className="text-slate-500 mt-2 uppercase tracking-[0.3em] text-[10px] font-bold italic">FitData GYM • Protocolo de Salud</p>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {miembros.map((miembro) => (
          <div key={miembro.id} className="bg-[#1e293b] rounded-3xl border border-slate-800 p-6 hover:border-cyan-500/30 transition-all group shadow-lg relative">
            <div className="absolute top-4 right-6">
              <span className="text-[11px] font-mono font-black text-cyan-400 block uppercase">
                ID: {miembro.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between items-start mb-6 pt-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl" style={{ backgroundColor: miembro.displayColor }}>
                <User size={28} strokeWidth={2.5} />
              </div>
              <Activity size={22} className="text-slate-700 group-hover:text-cyan-500/50 transition-colors" />
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
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 font-black text-[10px] tracking-[0.2em] uppercase transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
            >
              EXPEDIENTE <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <ModalExpedienteNutri 
          miembro={selectedMiembro} 
          todasLasCitas={citas}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default CitasNutri;