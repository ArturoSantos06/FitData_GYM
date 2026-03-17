import React, { useState } from 'react';
import { db } from "../firebase/config"; 
import { collection, addDoc } from 'firebase/firestore';
import DialogoSistemaNutri from './DialogoSistemaNutri';
import { Clock, Calendar as CalIcon, MessageSquare } from 'lucide-react';

const ModalAgendarNutri = ({ fecha, miembro, notaIncial, todasLasCitas, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('09:00');
  const [dialog, setDialog] = useState(null);

  const handleSave = async () => {
    if (!motivo.trim()) return;

    // 1. VALIDACIÓN DE HORARIO DEL GIMNASIO (06:00 a 19:00)
    const hIn = parseInt(horaInicio.split(':')[0]);
    const hOut = parseInt(horaFin.split(':')[0]);
    if (hIn < 6 || hOut > 19 || hIn >= hOut) {
        setDialog({ type: 'danger', title: 'Horario Inválido', message: 'El gimnasio opera de 06:00 a 19:00.', onConfirm: () => setDialog(null) });
        return;
    }

    // 2. VALIDACIÓN DE TRASLAPE CON OTROS O CONSIGO MISMO
    const conflictoMismaHora = todasLasCitas.find(c => 
        c.fecha === fecha && 
        ((horaInicio >= c.horaInicio && horaInicio < c.horaFin) || (horaFin > c.horaInicio && horaFin <= c.horaFin))
    );

    if (conflictoMismaHora) {
        // Caso A: Es el mismo cliente intentando duplicar
        if (conflictoMismaHora.clienteId === miembro.id) {
            setDialog({ 
                type: 'warning', 
                title: 'Cita Duplicada', 
                message: `Ya tienes una cita agendada para este mismo día a las ${conflictoMismaHora.horaInicio}. No puedes agendar dos veces a la misma hora.`, 
                onConfirm: () => setDialog(null) 
            });
            return;
        }
        // Caso B: Es otro cliente (traslape general)
        setDialog({ type: 'danger', title: 'Horario Ocupado', message: 'Este bloque ya está reservado por otro paciente.', onConfirm: () => setDialog(null) });
        return;
    }

    try {
        await addDoc(collection(db, "citas"), {
          clienteId: miembro.id,
          nombrePaciente: `${miembro.nombre} ${miembro.apellido}`,
          title: motivo,
          fecha: fecha,
          horaInicio: horaInicio,
          horaFin: horaFin,
          nota: notaIncial,
          fechaRegistro: new Date().toISOString()
        });

        // MODAL DE ÉXITO
        setDialog({ 
            type: 'success', // He añadido este tipo verde en el Dialogo
            title: '¡Cita Registrada!', 
            message: 'La sesión de nutrición se ha guardado correctamente en el sistema.', 
            onConfirm: () => {
                setDialog(null);
                onSuccess();
            } 
        });
    } catch (err) {
        console.error(err);
        // MODAL DE ERROR
        setDialog({ 
            type: 'danger', 
            title: 'Error de Sistema', 
            message: 'Hubo un problema al conectar con la base de datos. Intenta de nuevo.', 
            onConfirm: () => setDialog(null) 
        });
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      {/* El Dialogo vive aquí dentro para estar en el nivel más alto de este modal */}
      {dialog && <DialogoSistemaNutri {...dialog} />}
      
      <div className="bg-[#1e293b] border border-cyan-500/30 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md">
        <h3 className="text-xl font-black italic mb-6 uppercase text-white">Finalizar Registro</h3>
        
        <div className="space-y-5">
            <div className="flex items-center gap-3 bg-[#0f172a] p-4 rounded-2xl border border-slate-800">
                <CalIcon size={18} className="text-cyan-400" />
                <span className="text-xs font-black uppercase text-slate-300">{fecha}</span>
            </div>

            <input 
              placeholder="Motivo de consulta"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-white outline-none font-bold focus:ring-1 focus:ring-cyan-500"
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <Clock size={14} className="absolute left-4 top-4 text-cyan-400" />
                    <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 pl-10 text-white font-black outline-none" />
                </div>
                <div className="relative">
                    <Clock size={14} className="absolute left-4 top-4 text-purple-400" />
                    <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 pl-10 text-white font-black outline-none" />
                </div>
            </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-transparent border border-red-500/50 text-red-500 font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-[1.5] py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-black text-[10px] uppercase shadow-lg shadow-cyan-900/40">
            Confirmar Cita
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgendarNutri;