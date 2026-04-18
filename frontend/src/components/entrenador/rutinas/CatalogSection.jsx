import React from 'react';
import { BookOpen } from 'lucide-react';

const BODY_PARTS = [
    { key: 'chest', label: 'Pecho' },
    { key: 'back', label: 'Espalda' },
    { key: 'upper arms', label: 'Brazos' },
    { key: 'lower arms', label: 'Antebrazos' },
    { key: 'upper legs', label: 'Piernas' },
    { key: 'lower legs', label: 'Pantorrillas' },
    { key: 'shoulders', label: 'Hombros' },
    { key: 'waist', label: 'Abdomen' },
    { key: 'cardio', label: 'Cardio' },
];

const toSpanishLabel = (LABEL_TRANSLATIONS, value) => {
    if (!value) return '';
    const key = String(value).trim().toLowerCase();
    return LABEL_TRANSLATIONS[key] || value;
};

export default function CatalogSection({
    catalogBodyPart,
    catalogExercises,
    isCatalogLoading,
    activeDay,
    onFetchCatalog,
    onAddExercise,
    LABEL_TRANSLATIONS,
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            {/* Header catálogo */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
                <BookOpen size={16} className="text-blue-400" />
                <span className="font-semibold text-white text-sm">Catálogo de ejercicios</span>
                <span className="ml-auto text-xs text-slate-500">
                    Clic para agregar a <span className="text-blue-400 font-semibold">{activeDay}</span>
                </span>
            </div>

            {/* Pills de grupos musculares */}
            <div className="flex flex-wrap gap-2 p-3 border-b border-slate-800 shrink-0">
                {BODY_PARTS.map((bp) => (
                    <button
                        key={bp.key}
                        type="button"
                        onClick={() => onFetchCatalog(bp.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${catalogBodyPart === bp.key
                                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/40'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                            }`}
                    >
                        {bp.label}
                    </button>
                ))}
            </div>

            {/* Grid de ejercicios */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[480px]">
                {!catalogBodyPart && !isCatalogLoading && (
                    <div className="text-center py-12 text-slate-600">
                        <p className="text-3xl mb-3">💪</p>
                        <p className="text-sm">Selecciona un grupo muscular</p>
                        <p className="text-xs mt-1">para ver el catálogo de ejercicios</p>
                    </div>
                )}
                {isCatalogLoading && (
                    <div className="text-center py-12 text-slate-500 text-sm">
                        <div className="text-3xl mb-3 animate-pulse">⏳</div>
                        Cargando ejercicios…
                    </div>
                )}
                {!isCatalogLoading && catalogBodyPart && catalogExercises.length === 0 && (
                    <div className="text-center py-12 text-slate-600 text-sm">
                        Sin resultados para este grupo muscular.
                    </div>
                )}
                {!isCatalogLoading && catalogExercises.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        {catalogExercises.map((ex) => (
                            <button
                                key={ex.id}
                                type="button"
                                onClick={() => onAddExercise(ex)}
                                className="flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-600 hover:shadow-lg hover:shadow-blue-900/20 transition-all text-left group"
                            >
                                {ex.gifUrl ? (
                                    <img
                                        src={ex.gifUrl}
                                        alt={ex.name}
                                        className="w-full h-28 object-cover bg-slate-900 group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-28 bg-slate-800 flex items-center justify-center text-4xl">
                                        🏋️
                                    </div>
                                )}
                                <div className="p-2.5 flex flex-col space-y-1.5">
                                    <p className="text-xs font-semibold text-white capitalize truncate group-hover:text-blue-400 transition-colors">
                                        {ex.name}
                                    </p>
                                    <div className="flex flex-col gap-0.5">
                                        {ex.primaryMuscle && (
                                            <span className="text-xs text-emerald-400 capitalize">
                                                💪 {toSpanishLabel(LABEL_TRANSLATIONS, ex.primaryMuscle)}
                                            </span>
                                        )}
                                        {ex.tags?.[0] && (
                                            <span className="text-xs text-amber-400 capitalize">
                                                {toSpanishLabel(LABEL_TRANSLATIONS, ex.tags[0])}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
