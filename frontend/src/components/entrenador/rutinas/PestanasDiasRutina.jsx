import React from 'react';

function PestanasDiasRutina({ diaActivo, diasActivos, ejerciciosPorDia, onCambiarDia }) {
  return (
    <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950 shrink-0">
      {diasActivos.map((dia) => (
        <button
          key={dia}
          type="button"
          onClick={() => onCambiarDia(dia)}
          className={`shrink-0 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            diaActivo === dia
              ? 'border-blue-500 text-white bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
          }`}
        >
          {dia}
          {(ejerciciosPorDia[dia]?.length || 0) > 0 && (
            <span className="ml-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
              {ejerciciosPorDia[dia].length}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default PestanasDiasRutina;
