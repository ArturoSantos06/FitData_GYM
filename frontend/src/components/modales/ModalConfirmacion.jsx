import React from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, Trash2 } from 'lucide-react';

const ModalConfirmacion = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Sí, Eliminar',
  variant = 'danger',
  overlayClassName = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in',
}) => {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';
  const iconWrapClass = isDanger ? 'bg-red-500/20' : 'bg-blue-500/20';
  const iconClass = isDanger ? 'text-red-500' : 'text-blue-400';
  const confirmButtonClass = isDanger
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-blue-600 hover:bg-blue-700';

  return createPortal(
    <div className={overlayClassName}>
      <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center transform scale-100 transition-transform">
        
        <div className="mb-4 flex justify-center">
          <div className={`${iconWrapClass} p-3 rounded-full`}>
            {isDanger ? <Trash2 className={`h-8 w-8 ${iconClass}`} /> : <CircleHelp className={`h-8 w-8 ${iconClass}`} />}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6 text-sm whitespace-pre-wrap wrap-anywhere">
          {message}
        </p>

        <div className="flex gap-3 justify-center">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors w-full"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-4 py-2 text-white rounded-lg font-bold transition-colors w-full shadow-lg ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalConfirmacion;