import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { X, User, ClipboardEdit } from 'lucide-react';
import ModalAgendarNutri from './ModalAgendarNutri';
import ModalDetalleNutri from './ModalDetalleNutri';
import DialogoSistemaNutri from './DialogoSistemaNutri';

const ModalExpedienteNutri = ({ miembro, todasLasCitas, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingCita, setViewingCita] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notaPrevia, setNotaPrevia] = useState('');

  const handleDateClick = (arg) => {
    const date = new Date(arg.date);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (date < today || date.getDay() === 0) {
        // El feedback visual ya lo da el cursor, pero mantenemos la lógica de bloqueo
        return;
    }
    setSelectedDate(arg.dateStr);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[50] p-4">
      <div className="bg-[#1e293b] w-full max-w-6xl rounded-[2.5rem] border border-slate-700 flex flex-col md:flex-row h-[90vh] overflow-hidden shadow-2xl relative">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-80 p-8 bg-[#111827] border-r border-slate-800/50 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-black text-2xl tracking-tighter italic text-white uppercase">FIT<span className="text-cyan-400">DATA</span></h2>
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="flex flex-col items-center text-center mb-8 p-6 bg-slate-900/50 rounded-[2rem] border border-slate-800 shadow-inner">
             <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4 shadow-2xl" style={{ backgroundColor: miembro.displayColor }}>
               <User size={40}/>
             </div>
             <div className="text-lg font-black text-white uppercase leading-tight">
                {miembro.nombre} <br/>
                <span className="text-cyan-400 text-sm font-bold opacity-80">{miembro.apellido}</span>
             </div>
             <div className="mt-3 px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-700">
                {miembro.edad ? `${miembro.edad} AÑOS` : "EDAD N/A"}
             </div>
          </div>

          <div className="flex-1 flex flex-col space-y-3">
             <label className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                <ClipboardEdit size={12} /> Notas de seguimiento
             </label>
             <textarea 
                value={notaPrevia}
                onChange={(e) => setNotaPrevia(e.target.value)}
                placeholder="Escribe las notas antes de agendar..."
                className="w-full flex-1 bg-[#0f172a] border border-slate-800 rounded-3xl p-5 text-slate-200 text-sm outline-none focus:border-cyan-500/50 transition-all resize-none shadow-inner font-medium"
             />
          </div>
        </div>

        {/* CALENDARIO PERSONALIZADO */}
        <div className="flex-1 p-8 bg-[#0f172a] overflow-y-auto">
          <style>{`
            /* 1. Bordes oscuros y sutiles */
            .fc td, .fc th, .fc .fc-scrollgrid { border-color: #1e293b !important; }
            
            /* 2. Números de fecha brillantes */
            .fc-daygrid-day-number { 
                color: #e2e8f0 !important; 
                font-weight: 900 !important; 
                padding: 12px !important;
                font-family: 'Inter', sans-serif;
                font-size: 0.9rem !important;
            }

            /* 3. Hovers de selección */
            .fc-daygrid-day:hover { 
                background-color: rgba(6, 182, 212, 0.1) !important; 
                cursor: pointer;
            }

            /* 4. Domingo con hover naranja */
            .fc-day-sun:hover { 
                background-color: rgba(249, 115, 22, 0.1) !important; 
            }

            /* 5. Cursor prohibido para días pasados y domingos */
            .fc-day-past:hover, .fc-day-sun:hover { 
                cursor: not-allowed !important; 
            }

            /* Estética General */
            .fc .fc-toolbar-title { color: white; font-weight: 900; text-transform: uppercase; font-size: 1.1rem; letter-spacing: -0.05em; }
            .fc .fc-button-primary { background: #1e293b; border: 1px solid #334155; font-weight: 900; border-radius: 12px; text-transform: uppercase; font-size: 0.65rem; padding: 8px 16px; }
            .fc .fc-button-active { background: #06b6d4 !important; border-color: #06b6d4 !important; }
            .fc-col-header-cell-cushion { color: #475569; text-transform: uppercase; font-size: 0.6rem; font-weight: 900; letter-spacing: 0.1em; padding: 10px 0 !important; }
            .fc-event { background: linear-gradient(to right, #6366f1, #06b6d4); border: none; padding: 5px 8px; border-radius: 8px; font-weight: 900; font-size: 0.7rem; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          `}</style>
          
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            events={todasLasCitas.filter(c => c.clienteId === miembro.id).map(c => ({
                id: c.id, title: c.title, start: c.fecha, extendedProps: { ...c }
            }))}
            dateClick={handleDateClick}
            eventClick={(info) => setViewingCita(info.event.extendedProps)}
            locale="es" height="100%"
          />
        </div>

        {/* MODALES HIJOS */}
        {selectedDate && (
          <ModalAgendarNutri 
            fecha={selectedDate} 
            miembro={miembro} 
            notaIncial={notaPrevia}
            todasLasCitas={todasLasCitas}
            onClose={() => setSelectedDate(null)} 
            onSuccess={() => { setSelectedDate(null); setNotaPrevia(''); }}
          />
        )}
        {viewingCita && <ModalDetalleNutri cita={viewingCita} onClose={() => setViewingCita(null)} />}
        {dialog && <DialogoSistemaNutri {...dialog} />}
      </div>
    </div>
  );
};

export default ModalExpedienteNutri;