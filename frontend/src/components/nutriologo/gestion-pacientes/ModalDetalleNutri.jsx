import React, { useState } from 'react';
import { db } from "../../../firebase/config"; 
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Trash2, Edit3, Save, X, ClipboardList, CalendarClock } from 'lucide-react';
import DialogoSistemaNutri from '../DialogoSistemaNutri';

const ModalDetalleNutri = ({ cita, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(cita.nota || '');
  const [dialogConfig, setDialogConfig] = useState(null);

  const handleUpdate = async () => {
    try {
      const citaRef = doc(db, "citas", cita.id);
      await updateDoc(citaRef, { nota: editContent });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setDialogConfig({ type: 'danger', title: 'Error', message: 'No se pudo actualizar la nota.', onConfirm: () => setDialogConfig(null) });
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

  // Formateo manual para evitar "Invalid Date"
  const fechaFormateada = `${cita.fecha} | ${cita.horaInicio} - ${cita.horaFin}`;

  return (
    <div className="absolute inset-0 z-120 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      {dialogConfig && <DialogoSistemaNutri {...dialogConfig} />}

      <div className="bg-[#1e293b] border border-purple-500/40 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-2xl font-black italic uppercase text-purple-400 tracking-tighter leading-none">
                    {cita.title}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
                   <ClipboardList size={12} className="text-purple-500" /> Registro de Seguimiento
                </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones del Especialista</label>
          {isEditing ? (
            <textarea 
              className="w-full bg-[#0f172a] border border-purple-500/50 rounded-2xl p-5 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none min-h-[180px] text-sm font-medium"
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)} 
              autoFocus
            />
          ) : (
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 max-h-56 overflow-y-auto shadow-inner">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                {cita.nota || "Sin notas registradas."}
                </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all">
            Borrar
          </button>
          
          {isEditing ? (
            <button onClick={handleUpdate} className="flex-[1.5] py-4 rounded-2xl bg-purple-600 text-white font-black text-[10px] uppercase shadow-lg shadow-purple-900/20">
              Guardar
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex-[1.5] py-4 rounded-2xl bg-slate-700 text-white font-black text-[10px] uppercase hover:bg-slate-600 transition-colors">
              Editar Notas
            </button>
          )}
        </div>

        {/* Footer de fecha corregido y más visible */}
        <div className="mt-6 pt-5 border-t border-slate-800/50 flex flex-col items-center">
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