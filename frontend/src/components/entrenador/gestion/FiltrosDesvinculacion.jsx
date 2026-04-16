import React from 'react';
import { Search } from 'lucide-react';

function FiltrosDesvinculacion({ terminoBusqueda, onCambiarBusqueda, mostrandoArchivados, onAlternarArchivados }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
      <div className="relative w-full md:w-64">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-2 px-4 pl-10 focus:outline-none focus:border-teal-500 text-sm transition-all"
          value={terminoBusqueda}
          onChange={(e) => onCambiarBusqueda(e.target.value)}
        />
        <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
      </div>

      <button
        onClick={onAlternarArchivados}
        className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition-all ${
          mostrandoArchivados
            ? 'bg-teal-900/40 text-teal-400 border border-teal-500/50'
            : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border border-transparent'
        }`}
      >
        {mostrandoArchivados ? 'Mostrar Activos' : 'Mostrar Archivados'}
      </button>
    </div>
  );
}

export default FiltrosDesvinculacion;
