import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

const DialogoSistemaNutri = ({ type, title, message, onConfirm, onCancel }) => {
  const isDanger = type === 'danger';
  const isSuccess = type === 'success';
  const isWarning = type === 'warning';
  
  const getColors = () => {
    if (isSuccess) return { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-500', btn: 'bg-emerald-600', icon: <CheckCircle size={32} /> };
    if (isDanger) return { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-500', btn: 'bg-red-600', icon: <AlertTriangle size={32} /> };
    return { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-500', btn: 'bg-amber-600', icon: <Info size={32} /> };
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`bg-[#1e293b] border ${colors.border} p-8 rounded-[2rem] shadow-2xl w-full max-w-sm text-center animate-in zoom-in duration-200`}>
        <div className={`mx-auto w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center mb-6 ${colors.text}`}>
          {colors.icon}
        </div>
        <h3 className="text-xl font-black uppercase italic mb-2 text-white tracking-tighter">{title}</h3>
        <p className="text-slate-400 text-sm mb-8 font-medium leading-relaxed">{message}</p>
        
        <div className="flex gap-3">
          {onCancel && (
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-black text-[10px] uppercase border border-slate-700">
                Cancelar
            </button>
          )}
          <button onClick={onConfirm} className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase text-white shadow-lg ${colors.btn}`}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogoSistemaNutri;