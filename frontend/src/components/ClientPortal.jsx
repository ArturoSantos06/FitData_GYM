import React from 'react';
import { Link } from 'react-router-dom';

function ClientPortal() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <img src="/fitdata-logo.png" alt="Logo" className="h-32 mb-8 opacity-80" />
      
      <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-700 text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-cyan-400 mb-4">Portal de Clientes</h1>
        <p className="text-xl text-gray-300 mb-8">
          Estamos construyendo una experiencia increíble para ti. <br/>
          Pronto podrás ver tus rutinas, estado de membresía y más.
        </p>
        
        <div className="p-4 bg-gray-700/50 rounded-lg border border-dashed border-gray-600 mb-8">
          <span className="text-purple-400 font-mono">Estado: En Desarrollo 🛠️</span>
        </div>

        <Link 
          to="/" 
          className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-full font-bold transition-all"
        >
          &larr; Volver al Inicio
        </Link>
      </div>
    </div>
  );
}

export default ClientPortal;