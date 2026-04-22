import React, { useState } from 'react';
import { db } from "../../../firebase/config";
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Trash2, Edit3, Save, X, Zap, CalendarClock, Clock, Calendar as CalIcon } from 'lucide-react';
import DialogoSistemaNutri from '../../nutriologo/DialogoSistemaNutri';

const ModalDetalleEntrenador = ({ entreno, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editFecha, setEditFecha] = useState(entreno.fecha || '');
  const [editHoraInicio, setEditHoraInicio] = useState(entreno.horaInicio || '');
  const [editHoraFin, setEditHoraFin] = useState(entreno.horaFin || '');
  const [editEnfoque, setEditEnfoque] = useState(entreno.title || '');
  const [editRutina, setEditRutina] = useState(entreno.rutina || '');
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
      const entrenoRef = doc(db, "entrenamientos", entreno.id);
      await updateDoc(entrenoRef, {
        fecha: editFecha,
        horaInicio: editHoraInicio,
        horaFin: editHoraFin,
        title: editEnfoque,
        rutina: editRutina,
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setDialogConfig({ type: 'danger', title: 'Error', message: 'No se pudo actualizar la sesión.', onConfirm: () => setDialogConfig(null) });
    }
  };

  const confirmDelete = () => {
    setDialogConfig({
      type: 'danger',
      title: 'Eliminar Sesión',
      message: '¿Borrar este entrenamiento? Esta acción es irreversible.',
      onConfirm: async () => {
        await deleteDoc(doc(db, "entrenamientos", entreno.id));
        setDialogConfig(null);
        onClose();
      },
      onCancel: () => setDialogConfig(null)
    });
  };

  const fechaFormateada = `${entreno.fecha} | ${entreno.horaInicio} - ${entreno.horaFin}`;

  return (
    <div className="absolute inset-0 z-120 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      {dialogConfig && <DialogoSistemaNutri {...dialogConfig} />}

      <div className="bg-[#1e293b] border border-blue-400/40 p-6 rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-2xl font-black uppercase text-white-400 tracking-tighter leading-none">
              {isEditing ? 'Editar Sesión' : entreno.title}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
              <Zap size={12} className="text-blue-400" /> Plan de Entrenamiento
            </p>
            {!isEditing && entreno.horaInicio && entreno.horaFin && (
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-400/15 border border-blue-400/30 rounded-full px-3 py-1">
                <CalendarClock size={12} className="text-blue-400" />
                <span className="text-blue-300 font-black text-xs tracking-widest">
                  {entreno.horaInicio} – {entreno.horaFin}
                </span>
              </div>
            )}
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
                  <Clock size={13} className="absolute left-3 text-blue-400 pointer-events-none" />
                  <input type="time" value={editHoraFin} onChange={(e) => setEditHoraFin(e.target.value)}
                    className="block w-full bg-transparent border-0 p-3 pl-9 text-white font-black outline-none cursor-pointer text-sm" />
                </label>
              </div>
            </div>

            {/* Enfoque */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Enfoque de la sesión</label>
              <input
                className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-3 text-white outline-none font-bold focus:ring-1 focus:ring-blue-500 text-sm"
                value={editEnfoque}
                onChange={(e) => setEditEnfoque(e.target.value)}
              />
            </div>

            {/* Rutina / Notas */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Detalles de la rutina / Notas</label>
              <textarea
                className="w-full bg-[#0f172a] border border-blue-400/50 rounded-2xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[120px] text-sm font-medium"
                value={editRutina}
                onChange={(e) => setEditRutina(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Detalles de la rutina</label>
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto shadow-inner mt-1">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                {entreno.rutina || "No se han definido ejercicios para esta sesión."}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={confirmDelete} className="flex-1 py-3.5 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">
            Eliminar
          </button>

          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-700 text-white font-black text-[10px] uppercase hover:bg-slate-600 transition-colors">
                Cancelar
              </button>
              <button onClick={handleUpdate} className="flex-[1.5] py-3.5 rounded-2xl bg-blue-500 text-white font-black text-[10px] uppercase shadow-lg shadow-blue-900/20">
                Guardar Sesión
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex-[1.5] py-3.5 rounded-2xl bg-slate-700 text-white font-black text-[10px] uppercase hover:bg-slate-600 transition-colors">
              Editar Plan
            </button>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-slate-800/50 flex flex-col items-center">
          <div className="flex items-center gap-2 text-blue-400 font-black text-[11px] uppercase tracking-tighter bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20 shadow-lg shadow-blue-900/10">
            <CalendarClock size={14} />
            {fechaFormateada}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleEntrenador;