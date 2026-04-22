import React, { useState } from 'react';
import { db } from "../../../firebase/config";
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Trash2, Edit3, Save, X, ClipboardList, CalendarClock, Clock, Calendar as CalIcon } from 'lucide-react';
import DialogoSistemaNutri from '../DialogoSistemaNutri';

const ModalDetalleNutri = ({ cita, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editFecha, setEditFecha] = useState(cita.fecha || '');
  const [editHoraInicio, setEditHoraInicio] = useState(cita.horaInicio || '');
  const [editHoraFin, setEditHoraFin] = useState(cita.horaFin || '');
  const [editMotivo, setEditMotivo] = useState(cita.title || '');
  const [editNota, setEditNota] = useState(cita.nota || '');
  const [dialogConfig, setDialogConfig] = useState(null);

  const handleUpdate = async () => {
    const hIn = parseInt((editHoraInicio || '').split(':')[0]);
    const hOut = parseInt((editHoraFin || '').split(':')[0]);
    if (hIn >= hOut) {
      setDialogConfig({ type: 'danger', title: 'Horario Inválido', message: 'La hora de inicio no puede ser igual o posterior a la hora de salida.', onConfirm: () => setDialogConfig(null) });
      return;
    }
    if (hIn < 6 || hOut > 19) {
      setDialogConfig({ type: 'danger', title: 'Horario Inválido', message: 'El gimnasio opera de 06:00 a 19:00.', onConfirm: () => setDialogConfig(null) });
      return;
    }
    try {
      const citaRef = doc(db, "citas", cita.id);
      await updateDoc(citaRef, {
        fecha: editFecha,
        horaInicio: editHoraInicio,
        horaFin: editHoraFin,
        title: editMotivo,
        nota: editNota,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setDialogConfig({ type: 'danger', title: 'Error', message: 'No se pudo actualizar la cita.', onConfirm: () => setDialogConfig(null) });
    }
  };

  const confirmDelete = () => {
    setDialogConfig({
      type: 'danger',
      title: 'Eliminar Cita',
      message: '¿Estás seguro de que deseas borrar este registro? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        await deleteDoc(doc(db, "citas", cita.id));
        setDialogConfig(null);
        onClose();
      },
      onCancel: () => setDialogConfig(null)
    });
  };

  const fechaFormateada = `${cita.fecha} | ${cita.horaInicio} - ${cita.horaFin}`;

  return (
    <div className="absolute inset-0 z-120 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      {dialogConfig && <DialogoSistemaNutri {...dialogConfig} />}

      <div className="bg-[#1e293b] border border-purple-500/40 p-6 rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-2xl font-black uppercase text-white-400 tracking-tighter leading-none">
              {isEditing ? 'Editar Cita' : cita.title}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
              <ClipboardList size={12} className="text-purple-500" /> Registro de Seguimiento
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {/* Fecha */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Fecha</label>
              <div className="relative flex items-center rounded-2xl border border-slate-700 bg-[#0f172a] overflow-hidden">
                <CalIcon size={14} className="absolute left-4 text-cyan-400 pointer-events-none" />
                <input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  className="block w-full bg-transparent border-0 p-4 pl-10 text-white font-black outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Horas */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Horario</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="relative rounded-2xl border border-slate-700 bg-[#0f172a] overflow-hidden flex items-center cursor-pointer">
                  <Clock size={13} className="absolute left-3 text-cyan-400 pointer-events-none" />
                  <input type="time" value={editHoraInicio} onChange={(e) => setEditHoraInicio(e.target.value)}
                    className="block w-full bg-transparent border-0 p-3 pl-9 text-white font-black outline-none cursor-pointer text-sm" />
                </label>
                <label className="relative rounded-2xl border border-slate-700 bg-[#0f172a] overflow-hidden flex items-center cursor-pointer">
                  <Clock size={13} className="absolute left-3 text-purple-400 pointer-events-none" />
                  <input type="time" value={editHoraFin} onChange={(e) => setEditHoraFin(e.target.value)}
                    className="block w-full bg-transparent border-0 p-3 pl-9 text-white font-black outline-none cursor-pointer text-sm" />
                </label>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Motivo de consulta</label>
              <input
                className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-white outline-none font-bold focus:ring-1 focus:ring-purple-500 text-sm"
                value={editMotivo}
                onChange={(e) => setEditMotivo(e.target.value)}
              />
            </div>

            {/* Notas */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Notas de seguimiento</label>
              <textarea
                className="w-full bg-[#0f172a] border border-purple-500/50 rounded-2xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none min-h-[120px] text-sm font-medium"
                value={editNota}
                onChange={(e) => setEditNota(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones del Especialista</label>
              <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto shadow-inner mt-1">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                  {cita.nota || "Sin notas registradas."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={confirmDelete} className="flex-1 py-3.5 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">
            Borrar
          </button>

          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-700 text-white font-black text-[10px] uppercase hover:bg-slate-600 transition-colors">
                Cancelar
              </button>
              <button onClick={handleUpdate} className="flex-[1.5] py-3.5 rounded-2xl bg-purple-600 text-white font-black text-[10px] uppercase shadow-lg shadow-purple-900/20">
                Guardar
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex-[1.5] py-3.5 rounded-2xl bg-slate-700 text-white font-black text-[10px] uppercase hover:bg-slate-600 transition-colors">
              Editar Cita
            </button>
          )}
        </div>

        {/* Footer de fecha */}
        <div className="mt-5 pt-5 border-t border-slate-800/50 flex flex-col items-center">
          <div className="flex items-center gap-2 text-cyan-400 font-black text-[11px] uppercase tracking-tighter bg-cyan-400/10 px-4 py-2 rounded-full border border-cyan-400/20 shadow-lg shadow-cyan-900/10">
            <CalendarClock size={14} />
            {fechaFormateada}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleNutri;