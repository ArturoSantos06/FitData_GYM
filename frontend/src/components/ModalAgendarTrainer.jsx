import React, { useState } from 'react';
import { auth, db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import DialogoSistemaNutri from './DialogoSistemaNutri';
import { Clock, Calendar as CalIcon, Activity } from 'lucide-react';

const ModalAgendarTrainer = ({ fecha, miembro, rutinaInicial, todosLosEntrenos, onClose, onSuccess }) => {
  const [enfoque, setEnfoque] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('09:00');
  const [dialog, setDialog] = useState(null);

  const handleSave = async () => {
    if (!enfoque.trim()) return;

    const hIn = parseInt(horaInicio.split(':')[0]);
    const hOut = parseInt(horaFin.split(':')[0]);
    if (hIn < 6 || hOut > 19 || hIn >= hOut) {
      setDialog({ type: 'danger', title: 'Horario Inválido', message: 'El gimnasio opera de 06:00 a 19:00.', onConfirm: () => setDialog(null) });
      return;
    }

    const conflicto = todosLosEntrenos.find(c =>
      c.fecha === fecha &&
      ((horaInicio >= c.horaInicio && horaInicio < c.horaFin) || (horaFin > c.horaInicio && horaFin <= c.horaFin))
    );

    if (conflicto) {
      if (conflicto.clienteId === miembro.id) {
        setDialog({ type: 'warning', title: 'Sesión Duplicada', message: `Este atleta ya tiene rutina a las ${conflicto.horaInicio} este día.`, onConfirm: () => setDialog(null) });
        return;
      }
      setDialog({ type: 'danger', title: 'Espacio Ocupado', message: 'El entrenador ya tiene una sesión en este horario.', onConfirm: () => setDialog(null) });
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setDialog({
          type: 'danger',
          title: 'Sesion no valida',
          message: 'No hay una sesion activa en Firebase. Cierra sesion e inicia de nuevo para guardar la cita.',
          onConfirm: () => setDialog(null)
        });
        return;
      }

      const fullName = `${miembro.nombre || ''} ${miembro.apellido || ''}`.trim();

      await addDoc(collection(db, "entrenamientos"), {
        clienteId: miembro.id,
        nombreAtleta: fullName,
        title: enfoque,
        fecha: fecha,
        horaInicio: horaInicio,
        horaFin: horaFin,
        rutina: rutinaInicial || '',
        entrenadorId: currentUser?.uid || '',
        ownerUid: currentUser?.uid || '',
        entrenadorEmail: currentUser?.email || '',
        createdBy: currentUser?.uid || '',
        fechaRegistro: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setDialog({
        type: 'success',
        title: '¡Sesión Agendada!',
        message: 'El plan de entrenamiento ha sido registrado con éxito.',
        onConfirm: () => { setDialog(null); onSuccess(); }
      });
    } catch (err) {
      console.error(err);
      const errCode = String(err?.code || '').toLowerCase();
      const permissionError = errCode.includes('permission-denied');
      const message = permissionError
        ? 'No hay permisos para guardar esta cita. Inicia sesion de nuevo y verifica reglas de Firestore para entrenamientos.'
        : `Fallo al guardar en la base de datos. ${err?.message || ''}`.trim();

      setDialog({ type: 'danger', title: 'Error', message, onConfirm: () => setDialog(null) });
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      {dialog && <DialogoSistemaNutri {...dialog} />}

      <div className="bg-[#1e293b] border border-cyan-500/30 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md">
        <h3 className="text-xl font-black italic mb-6 uppercase text-white tracking-tighter">Programar Entrenamiento</h3>

        <div className="space-y-5">
          <div className="flex items-center gap-3 bg-[#0f172a] p-4 rounded-2xl border border-slate-800">
            <CalIcon size={18} className="text-cyan-400" />
            <span className="text-xs font-black uppercase text-slate-300">{fecha}</span>
          </div>

          <div className="relative">
            <Activity size={18} className="absolute left-4 top-4 text-cyan-400/50" />
            <input
              placeholder="Enfoque (ej. Tren Inferior)"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 pl-12 text-white outline-none font-bold focus:ring-1 focus:border-cyan-500 focus:ring-cyan-500 transition-all"
              value={enfoque} onChange={(e) => setEnfoque(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Clock size={14} className="absolute left-4 top-4 text-cyan-400" />
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 pl-10 text-white font-black outline-none focus:ring-1 focus:border-cyan-500 focus:ring-cyan-500 transition-all" />
            </div>
            <div className="relative">
              <Clock size={14} className="absolute left-4 top-4 text-blue-400" />
              <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 pl-10 text-white font-black outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition-all" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-transparent border border-slate-600 text-slate-400 font-black text-[10px] uppercase hover:bg-slate-800 hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-[1.5] py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-[10px] uppercase shadow-lg shadow-cyan-900/40 transition-all">
            Confirmar Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgendarTrainer;