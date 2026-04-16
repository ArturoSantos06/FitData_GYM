import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { X, User, Zap } from 'lucide-react';
import ModalAgendarEntrenador from './ModalAgendarEntrenador';
import ModalDetalleEntrenador from '../entrenador/seguimiento/ModalDetalleEntrenador';
import DialogoSistemaNutri from '../DialogoSistemaNutri';

const ModalExpedienteEntrenador = ({ miembro, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingEntreno, setViewingEntreno] = useState(null);
  const [dialog, _setDialog] = useState(null);
  const [rutinaPrevia, setRutinaPrevia] = useState('');
  const [entrenamientosMiembro, setEntrenamientosMiembro] = useState([]);

  useEffect(() => {
    if (!miembro?.id) return;
    const q = query(collection(db, 'entrenamientos'), where('clienteId', '==', miembro.id));
    const unsub = onSnapshot(q, (snap) => {
      setEntrenamientosMiembro(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [miembro.id]);

  const handleDateClick = (arg) => {
    const date = new Date(arg.date);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (date < today || date.getDay() === 0) return;
    setSelectedDate(arg.dateStr);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e293b] w-full max-w-6xl rounded-[2.5rem] border border-slate-700 flex flex-col md:flex-row h-[90vh] overflow-hidden shadow-2xl relative">
        
        <div className="w-full md:w-80 p-8 bg-[#111827] border-r border-slate-800/50 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-black text-2xl tracking-tighter italic text-white uppercase">AGEN<span className="text-cyan-400">DA</span></h2>
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="flex flex-col items-center text-center mb-8 p-6 bg-slate-900/50 rounded-4xl border border-slate-800 shadow-inner">
             <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4 shadow-2xl" style={{ backgroundColor: miembro.displayColor }}>
               <User size={40}/>
             </div>
             <div className="text-lg font-black text-white uppercase leading-tight">
                {miembro.nombre} <br/>
                <span className="text-cyan-400 text-sm font-bold opacity-80">{miembro.apellido}</span>
             </div>
             <div className="mt-3 px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-700">
                {miembro.edad ? `${miembro.edad} AÑOS` : 'ATLETA'}
             </div>
          </div>

          <div className="flex-1 flex flex-col space-y-3">
             <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                <Zap size={12} /> Detalles de la Rutina
             </label>
             <textarea 
                value={rutinaPrevia}
                onChange={(e) => setRutinaPrevia(e.target.value)}
                placeholder="Ej: 4x12 Sentadillas, 3x15 Press Banca..."
                className="w-full flex-1 bg-[#0f172a] border border-slate-800 rounded-3xl p-5 text-slate-200 text-sm outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none shadow-inner font-medium"
             />
          </div>
        </div>

        <div className="flex-1 p-8 bg-[#0f172a] overflow-y-auto">
          <style>{`
            .fc td, .fc th, .fc .fc-scrollgrid { border-color: #1e293b !important; }
            .fc-daygrid-day-number { color: #e2e8f0 !important; font-weight: 900 !important; padding: 12px !important; font-size: 0.9rem !important;}
            .fc-daygrid-day:hover { background-color: rgba(6, 182, 212, 0.1) !important; cursor: pointer;}
            .fc-day-sun:hover { background-color: rgba(239, 68, 68, 0.1) !important; cursor: not-allowed !important;}
            .fc-day-past:hover { cursor: not-allowed !important; }
            .fc .fc-toolbar-title { color: white; font-weight: 900; text-transform: uppercase; font-size: 1.1rem; }
            .fc .fc-button-primary { background: #1e293b; border: 1px solid #334155; font-weight: 900; border-radius: 12px; text-transform: uppercase; font-size: 0.65rem; transition: all 0.3s ease; }
            .fc .fc-button-primary:hover { background: #334155; }
            .fc .fc-button-active { background: #06b6d4 !important; border-color: #06b6d4 !important; color: #000 !important; }
            .fc-event { background: linear-gradient(to right, #06b6d4, #3b82f6); border: none; padding: 4px 8px; border-radius: 8px; font-weight: 900; font-size: 0.7rem; letter-spacing: 0.03em; }
            .fc-event:hover { filter: brightness(1.15); cursor: pointer; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3); }
            .fc-event-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          `}</style>
          
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            events={entrenamientosMiembro.map(c => ({
                id: c.id,
                title: c.horaInicio ? `${c.horaInicio}  ${c.title}` : c.title,
                start: c.fecha,
                extendedProps: { ...c }
            }))}
            dateClick={handleDateClick}
            eventClick={(info) => setViewingEntreno(info.event.extendedProps)}
            locale="es" height="100%"
          />
        </div>

        {selectedDate && (
          <ModalAgendarEntrenador 
            fecha={selectedDate} 
            miembro={miembro} 
            rutinaInicial={rutinaPrevia}
            todosLosEntrenos={entrenamientosMiembro}
            onClose={() => setSelectedDate(null)} 
            onSuccess={() => { setSelectedDate(null); setRutinaPrevia(''); }}
          />
        )}
        {viewingEntreno && <ModalDetalleEntrenador entreno={viewingEntreno} onClose={() => setViewingEntreno(null)} />}
        {dialog && <DialogoSistemaNutri {...dialog} />}
      </div>
    </div>
  );
};

export default ModalExpedienteEntrenador;