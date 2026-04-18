import React from 'react';

function SelectorDiasRutina({ diasSemana, activeDays, toggleDay, errorDias }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 font-semibold">Días de entrenamiento</p>
      <div className="flex flex-wrap gap-2">
        {diasSemana.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              activeDays.includes(day)
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      {errorDias && <p className="text-red-400 text-xs mt-3">{errorDias}</p>}
    </div>
  );
}

export default SelectorDiasRutina;
