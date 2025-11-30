import React from 'react';

const SuccessModal = ({ isOpen, onClose, title, message, subMessage, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-green-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center transform scale-100 transition-transform">
        
        <div className="mb-4 flex justify-center">
          <div className="bg-green-500/20 p-3 rounded-full animate-bounce-short">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-300 mb-4 text-lg">
          {message}
        </p>
        
        {subMessage && (
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-6">
            <p className="text-amber-400 font-mono font-bold text-xl">{subMessage}</p>
          </div>
        )}

        {children && (
          <div className="mb-4 text-left">
            {children}
          </div>
        )}

        {!children && (
          <button 
            onClick={onClose} 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg uppercase tracking-wide"
          >
            Aceptar
          </button>
        )}
      </div>
    </div>
  );
};

export default SuccessModal;