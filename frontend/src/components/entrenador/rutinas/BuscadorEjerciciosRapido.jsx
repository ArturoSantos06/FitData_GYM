import React from 'react';
import { Plus, Search, X } from 'lucide-react';

function BuscadorEjerciciosRapido({
  terminoBusqueda,
  resultados,
  buscando,
  onBuscar,
  onLimpiar,
  onAgregar,
  traduccionesEtiquetas,
  convertirEtiqueta,
}) {
  return (
    <div className="p-4 border-t border-slate-800 shrink-0">
      <div className="relative">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-blue-500 transition-colors">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar ejercicio (squat, curl, press…)"
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
          />
          {buscando && <span className="text-xs text-slate-500 shrink-0">Buscando…</span>}
          {terminoBusqueda && !buscando && (
            <button type="button" onClick={onLimpiar} className="shrink-0">
              <X size={14} className="text-slate-500 hover:text-slate-300" />
            </button>
          )}
        </div>

        {resultados.length > 0 && (
          <div className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
            {resultados.map((ejercicio) => (
              <button
                key={ejercicio.id}
                type="button"
                onClick={() => onAgregar(ejercicio)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0"
              >
                {ejercicio.gifUrl ? (
                  <img src={ejercicio.gifUrl} alt={ejercicio.name} className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-lg">🏋️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium capitalize truncate">{ejercicio.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {ejercicio.movementPattern && (
                      <span className="text-xs text-blue-400 capitalize">{convertirEtiqueta(traduccionesEtiquetas, ejercicio.movementPattern)}</span>
                    )}
                    {ejercicio.primaryMuscle && (
                      <span className="text-xs text-slate-500">· {convertirEtiqueta(traduccionesEtiquetas, ejercicio.primaryMuscle)}</span>
                    )}
                  </div>
                </div>
                <Plus size={14} className="text-blue-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BuscadorEjerciciosRapido;
