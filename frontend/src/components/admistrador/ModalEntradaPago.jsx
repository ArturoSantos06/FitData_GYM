import React from 'react';

function ModalEntradaPago({
  isOpen,
  title,
  subtitle,
  value,
  onChange,
  onClose,
  onConfirm,
  confirmLabel = 'Guardar pago',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        {subtitle ? <p className="text-gray-400 mb-5 text-sm">{subtitle}</p> : null}

        <label className="block text-sm text-gray-300 mb-2">Monto a pagar</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="0.00"
        />

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalEntradaPago;
