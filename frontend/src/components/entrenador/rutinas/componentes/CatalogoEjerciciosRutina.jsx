import React from 'react';
import { BookOpen } from 'lucide-react';
import { traducirEtiqueta, traducirTextoEjercicio } from '../../../../backend/utilidadesRutinaEntrenador';

function CatalogoEjerciciosRutina({
  activeDay,
  bodyParts = [],
  catalogBodyPart,
  isCatalogLoading,
  catalogExercises = [],
  onFetchCatalog,
  onAddExercise,
}) {
  const diaActivo = activeDay || 'dia';
  const partesCuerpo = Array.isArray(bodyParts) ? bodyParts : [];
  const parteCuerpoSeleccionada = catalogBodyPart || '';
  const cargandoCatalogo = Boolean(isCatalogLoading);
  const ejercicios = Array.isArray(catalogExercises) ? catalogExercises : [];
  const seleccionarParte = typeof onFetchCatalog === 'function' ? onFetchCatalog : () => {};
  const agregarEjercicio = typeof onAddExercise === 'function' ? onAddExercise : () => {};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
        <BookOpen size={16} className="text-blue-400" />
        <span className="font-semibold text-white text-sm">Catálogo de ejercicios</span>
        <span className="ml-auto text-xs text-slate-500">Clic para agregar a <span className="text-blue-400 font-semibold">{diaActivo}</span></span>
      </div>

      <div className="flex flex-wrap gap-2 p-3 border-b border-slate-800 shrink-0">
        {partesCuerpo.map((parte) => (
          <button
            key={parte.key}
            type="button"
            onClick={() => seleccionarParte(parte.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              parteCuerpoSeleccionada === parte.key
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/40'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            {parte.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-h-[480px]">
        {!parteCuerpoSeleccionada && !cargandoCatalogo && (
          <div className="text-center py-12 text-slate-600"><p className="text-3xl mb-3">💪</p><p className="text-sm">Selecciona un grupo muscular</p><p className="text-xs mt-1">para ver el catálogo de ejercicios</p></div>
        )}
        {cargandoCatalogo && (
          <div className="text-center py-12 text-slate-500 text-sm"><div className="text-3xl mb-3 animate-pulse">⏳</div>Cargando ejercicios…</div>
        )}
        {!cargandoCatalogo && parteCuerpoSeleccionada && ejercicios.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">Sin resultados para este grupo muscular.</div>
        )}

        {!cargandoCatalogo && ejercicios.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {ejercicios.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => agregarEjercicio(ex)}
                className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-600 hover:shadow-lg hover:shadow-blue-900/20 transition-all text-left group"
              >
                {ex.gifUrl ? (
                  <img src={ex.gifUrl} alt={traducirTextoEjercicio(ex.name)} className="w-full h-28 object-cover bg-slate-900 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                  <div className="w-full h-28 bg-slate-800 flex items-center justify-center text-3xl">🏋️</div>
                )}

                <div className="p-2.5">
                  <p className="text-white text-xs font-semibold capitalize leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
                    {traducirTextoEjercicio(ex.name)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ex.primaryMuscle && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 capitalize">{traducirEtiqueta(ex.primaryMuscle)}</span>}
                    {ex.tags?.[0] && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 capitalize">{traducirEtiqueta(ex.tags[0])}</span>}
                  </div>
                  <p className="text-blue-400 text-xs mt-1.5 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">+ Agregar a {diaActivo}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CatalogoEjerciciosRutina;
