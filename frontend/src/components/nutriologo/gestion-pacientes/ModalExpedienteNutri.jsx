import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { X, User } from 'lucide-react';
import ModalAgendarNutri from '../../modales/ModalAgendarNutri';
import ModalDetalleNutri from './ModalDetalleNutri';
import DialogoSistemaNutri from '../DialogoSistemaNutri';

const ModalExpedienteNutri = ({ miembro, todasLasCitas, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingCita, setViewingCita] = useState(null);
  const [dialog, _setDialog] = useState(null);
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
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-[#1a2332] w-full max-w-5xl h-[calc(100dvh-1.5rem)] md:h-[82vh] rounded-3xl md:rounded-4xl border border-slate-700/80 flex flex-col md:flex-row overflow-hidden shadow-2xl relative">

        {/* Botón cerrar — esquina superior derecha */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <X size={20} />
        </button>

        {/* SIDEBAR */}
        <div className="w-full md:w-72 p-4 md:p-6 bg-[#101827] border-b md:border-b-0 md:border-r border-slate-800/50 flex flex-col max-h-[34vh] md:max-h-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="mb-4 md:mb-6">
            <h2 className="font-black text-lg md:text-xl tracking-tight italic text-white uppercase leading-none">Agenda de <span className="text-cyan-400">Citas</span></h2>
          </div>

          <div className="flex flex-col items-center text-center mb-4 md:mb-6 p-4 md:p-5 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-inner">
             <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-white mb-3 shadow-xl" style={{ backgroundColor: miembro.displayColor }}>
               <User size={24} className="md:hidden"/>
               <User size={30} className="hidden md:block"/>
             </div>
             <div className="text-sm md:text-base font-black text-white uppercase leading-tight">
                {miembro.nombre} <br/>
                <span className="text-cyan-400 text-xs font-bold opacity-80">{miembro.apellido}</span>
             </div>
             <div className="mt-2 px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-700">
                {miembro.edad ? `${miembro.edad} AÑOS` : "EDAD N/A"}
             </div>
          </div>


        </div>

        <div className="flex-1 p-4 md:p-6 bg-[#0f172a] overflow-y-auto overflow-x-hidden min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <style>{`
            .fc {
              --fc-border-color: #1e293b;
            }
            .fc td, .fc th, .fc .fc-scrollgrid {
              border-color: #1e293b !important;
            }
            .fc-scroller-harness, .fc-scroller {
              overflow: hidden !important;
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

            @media (max-width: 767px) {
              .fc .fc-toolbar {
                flex-direction: column;
                gap: 0.6rem;
                align-items: stretch;
              }

              .fc .fc-toolbar-chunk {
                display: flex;
                justify-content: center;
                width: 100%;
              }

              .fc .fc-toolbar-title {
                font-size: 0.9rem !important;
                text-align: center;
              }

              .fc .fc-button-primary {
                padding: 0.42rem 0.68rem !important;
                font-size: 0.53rem !important;
              }

              .fc-daygrid-day-frame {
                min-height: 3.4rem;
              }

              .fc-daygrid-day-number {
                padding: 0.45rem !important;
                font-size: 0.72rem !important;
              }

              .fc-col-header-cell-cushion {
                font-size: 0.48rem !important;
                padding: 0.35rem 0 !important;
              }

              .fc-event {
                padding: 2px 5px;
                font-size: 0.56rem;
              }
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
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
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
            notaIncial=''
            todasLasCitas={todasLasCitas}
            onClose={() => setSelectedDate(null)} 
            onSuccess={() => setSelectedDate(null)}
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