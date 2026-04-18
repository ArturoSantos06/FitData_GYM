import React from 'react';

function ModalPagoServicioEntrenador({
  isOpen,
  title,
  subtitle,
  serviceType,
  serviceTypeOptions = [],
  serviceTypeReadOnly = false,
  onServiceTypeChange,
  value,
  amountReadOnly = false,
  amountHelperText = '',
  paymentMethod,
  onChange,
  onPaymentMethodChange,
  onClose,
  onConfirm,
  confirmLabel = 'Pagar y asignar',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        {subtitle ? <p className="text-gray-400 mb-5 text-sm whitespace-pre-wrap">{subtitle}</p> : null}

        {onServiceTypeChange ? (
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">Tipo de servicio</label>
            <select
              value={serviceType}
              onChange={(e) => onServiceTypeChange(e.target.value)}
              disabled={serviceTypeReadOnly}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-70"
            >
              {serviceTypeOptions.length > 0 ? (
                serviceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              ) : (
                <option value={serviceType || 'PERSONAL'}>{serviceType || 'Personal'}</option>
              )}
            </select>
          </div>
        ) : null}

        <label className="block text-sm text-gray-300 mb-2">Monto del servicio</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={amountReadOnly}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="0.00"
        />
        {amountHelperText ? (
          <p className="text-xs text-cyan-300 mt-2">{amountHelperText}</p>
        ) : null}

        {onPaymentMethodChange ? (
          <div className="mt-4">
            <label className="block text-sm text-gray-300 mb-2">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="TARJETA">Tarjeta</option>
            </select>
          </div>
        ) : null}

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalPagoServicioEntrenador;