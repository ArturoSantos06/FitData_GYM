import React from 'react';
import { Trash2 } from 'lucide-react';

function TarjetaEjercicioRutina({
  ejercicio,
  diaActivo,
  diasActivos,
  inputSm,
  traduccionesEtiquetas,
  convertirEtiqueta,
  onEliminar,
  onActualizar,
  onMover,
}) {
  return (
    <div className="flex gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors">
      {ejercicio.gifUrl ? (
        <img src={ejercicio.gifUrl} alt={ejercicio.titulo} className="w-16 h-16 rounded-lg object-cover bg-slate-900 shrink-0" loading="lazy" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-2xl select-none">🏋️</div>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm capitalize truncate">{ejercicio.titulo}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {ejercicio.movementPattern && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300 capitalize">
                  {convertirEtiqueta(traduccionesEtiquetas, ejercicio.movementPattern)}
                </span>
              )}
              {ejercicio.primaryMuscle && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 capitalize">
                  💪 {convertirEtiqueta(traduccionesEtiquetas, ejercicio.primaryMuscle)}
                </span>
              )}
              {ejercicio.tags?.[0] && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 capitalize">
                  🏋️ {convertirEtiqueta(traduccionesEtiquetas, ejercicio.tags[0])}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {diasActivos.filter((dia) => dia !== diaActivo).length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onMover(diaActivo, ejercicio.id, e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                <option value="" disabled>Mover a…</option>
                {diasActivos
                  .filter((dia) => dia !== diaActivo)
                  .map((dia) => (
                    <option key={dia} value={dia}>{dia}</option>
                  ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => onEliminar(diaActivo, ejercicio.id)}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950 rounded-lg transition-colors"
              title="Eliminar ejercicio"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input type="number" min="1" step="1" inputMode="numeric" placeholder="Series" value={ejercicio.series} onChange={(e) => onActualizar(diaActivo, ejercicio.id, 'series', e.target.value)} className={inputSm} />
          <input type="number" min="1" step="1" inputMode="numeric" placeholder="Reps" value={ejercicio.repeticiones} onChange={(e) => onActualizar(diaActivo, ejercicio.id, 'repeticiones', e.target.value)} className={inputSm} />
          <input type="number" min="1" step="1" inputMode="numeric" placeholder="Descanso" value={ejercicio.descanso} onChange={(e) => onActualizar(diaActivo, ejercicio.id, 'descanso', e.target.value)} className={inputSm} />
        </div>
      </div>
    </div>
  );
}

export default TarjetaEjercicioRutina;
