import React from 'react';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function SelectorDias({ diasActivos, onAlternarDia, errorFormulario }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 font-semibold">
                Días de entrenamiento
            </p>
            <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((dia) => (
                    <button
                        key={dia}
                        type="button"
                        onClick={() => onAlternarDia(dia)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${diasActivos.includes(dia)
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                            }`}
                    >
                        {dia}
                    </button>
                ))}
            </div>
            {errorFormulario && (
                <p className="text-red-400 text-xs mt-3">{errorFormulario}</p>
            )}
        </div>
    );
}
