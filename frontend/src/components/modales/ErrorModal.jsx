import React from 'react';

const ErrorModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center transform transition-all scale-100">
        
        {/* Icono de Error */}
        <div className="mb-4 flex justify-center">
          <div className="bg-red-500/20 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        
        <p className="text-gray-300 mb-6 text-sm leading-relaxed">
          {message}
        </p>

        <button 
          onClick={onClose} 
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg"
        >
          Entendido, corregir
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;