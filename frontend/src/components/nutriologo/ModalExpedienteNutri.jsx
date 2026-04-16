import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { X, User, ClipboardEdit } from 'lucide-react';
import ModalAgendarNutri from '../ModalAgendarNutri';
import ModalDetalleNutri from './ModalDetalleNutri';
import DialogoSistemaNutri from '../DialogoSistemaNutri';

const ModalExpedienteNutri = ({ miembro, todasLasCitas, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingCita, setViewingCita] = useState(null);
  const [dialog, _setDialog] = useState(null);
  const [notaPrevia, setNotaPrevia] = useState('');
  const [showPastDateModal, setShowPastDateModal] = useState(false);

  const handleDateClick = (arg) => {
    const date = new Date(arg.date);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (date < today) {
        setShowPastDateModal(true);
        return;
    }

    if (date.getDay() === 0) {
        return;
    }
    setSelectedDate(arg.dateStr);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] w-full max-w-5xl rounded-4xl border border-slate-700/80 flex flex-col md:flex-row h-[82vh] overflow-hidden shadow-2xl relative">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-72 p-6 bg-[#101827] border-r border-slate-800/50 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-xl tracking-tight italic text-white uppercase">FIT<span className="text-cyan-400">DATA</span></h2>
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="flex flex-col items-center text-center mb-6 p-5 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-inner">
             <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white mb-3 shadow-xl" style={{ backgroundColor: miembro.displayColor }}>
               <User size={30}/>
             </div>
             <div className="text-base font-black text-white uppercase leading-tight">
                {miembro.nombre} <br/>
                <span className="text-cyan-400 text-xs font-bold opacity-80">{miembro.apellido}</span>
             </div>
             <div className="mt-2 px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-700">
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
                className="w-full flex-1 min-h-[220px] bg-[#0f172a] border border-slate-800 rounded-2xl p-4 text-slate-200 text-sm outline-none focus:border-cyan-500/50 transition-all resize-none shadow-inner font-medium"
             />
          </div>
        </div>

        <div className="flex-1 p-6 bg-[#0f172a] overflow-y-auto">
          <style>{`
            .fc {
              --fc-border-color: #1e293b;
            }
            .fc td, .fc th, .fc .fc-scrollgrid {
              border-color: #1e293b !important;
            }
            .fc .fc-toolbar {
              margin-bottom: 0.75rem !important;
            }
            .fc-daygrid-day-number {
              color: #e2e8f0 !important;
              font-weight: 900 !important;
              padding: 8px !important;
              font-family: 'Inter', sans-serif;
              font-size: 0.82rem !important;
            }
            .fc-daygrid-day-frame {
              min-height: 74px;
              transition: background-color 0.2s ease, transform 0.2s ease;
            }
            .fc-daygrid-day:hover .fc-daygrid-day-frame {
              background-color: rgba(14, 165, 233, 0.08) !important;
              transform: translateY(-1px);
              cursor: pointer;
            }
            .fc-day-sun .fc-daygrid-day-frame {
              background-color: rgba(249, 115, 22, 0.06);
            }
            .fc-day-past .fc-daygrid-day-frame {
              background-color: rgba(100, 116, 139, 0.08) !important;
            }
            .fc-day-past:hover .fc-daygrid-day-frame {
              background-color: rgba(220, 38, 38, 0.12) !important;
              cursor: not-allowed !important;
            }
            .fc .fc-day-today {
              background: rgba(8, 145, 178, 0.14) !important;
              box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.5);
            }
            .fc .fc-toolbar-title {
              color: white;
              font-weight: 900;
              text-transform: uppercase;
              font-size: 0.95rem;
              letter-spacing: -0.05em;
            }
            .fc .fc-button-primary {
              background: #1e293b;
              border: 1px solid #334155;
              font-weight: 900;
              border-radius: 10px;
              text-transform: uppercase;
              font-size: 0.58rem;
              padding: 6px 12px;
            }
            .fc .fc-button-primary:hover {
              background: #334155;
              border-color: #475569;
            }
            .fc .fc-button-active {
              background: #06b6d4 !important;
              border-color: #06b6d4 !important;
            }
            .fc-col-header-cell-cushion {
              color: #475569;
              text-transform: uppercase;
              font-size: 0.55rem;
              font-weight: 900;
              letter-spacing: 0.1em;
              padding: 7px 0 !important;
            }
            .fc-event {
              background: linear-gradient(to right, #2563eb, #06b6d4);
              border: none;
              padding: 3px 6px;
              border-radius: 7px;
              font-weight: 900;
              font-size: 0.62rem;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
          `}</style>

          <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide">
            <span className="inline-flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400"></span> Hoy
            </span>
            <span className="inline-flex items-center gap-2 text-slate-400">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500"></span> Día pasado
            </span>
          </div>
          
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={new Date()}
            headerToolbar={{ left: '', center: 'title', right: '' }}
            showNonCurrentDates={false}
            fixedWeekCount={false}
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

        {showPastDateModal && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
              <h3 className="text-lg font-black text-red-300 mb-2">No se puede agendar días pasados</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Selecciona una fecha de hoy en adelante para registrar una nueva cita.
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPastDateModal(false)}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold transition-colors"
                  type="button"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalExpedienteNutri;