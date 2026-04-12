import React from 'react';
import { Trash2, Search, X, Plus } from 'lucide-react';

const toSpanishLabel = (LABEL_TRANSLATIONS, value) => {
    if (!value) return '';
    const key = String(value).trim().toLowerCase();
    return LABEL_TRANSLATIONS[key] || value;
};

export default function ExerciseListSection({
    activeDay,
    activeDays,
    exercisesByDay,
    formError,
    searchQuery,
    searchResults,
    isSearching,
    onSetActiveDay,
    onRemoveExercise,
    onUpdateExercise,
    onMoveExercise,
    onSearch,
    onClearSearch,
    onAddExercise,
    LABEL_TRANSLATIONS,
    inputSm,
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            {/* Tabs de días */}
            <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950 shrink-0">
                {activeDays.map((day) => (
                    <button
                        key={day}
                        type="button"
                        onClick={() => onSetActiveDay(day)}
                        className={`shrink-0 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${activeDay === day
                                ? 'border-blue-500 text-white bg-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
                            }`}
                    >
                        {day}
                        {(exercisesByDay[day]?.length || 0) > 0 && (
                            <span className="ml-1.5 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                                {exercisesByDay[day].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista de ejercicios */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[540px]">
                {formError && (
                    <div className="bg-red-950 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
                        {formError}
                    </div>
                )}
                {(exercisesByDay[activeDay] || []).length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        <p className="text-4xl mb-3">🏋️</p>
                        <p className="text-sm">Sin ejercicios para este día.</p>
                        <p className="text-xs mt-1 text-slate-600">
                            Busca abajo o usa el catálogo →
                        </p>
                    </div>
                ) : (
                    (exercisesByDay[activeDay] || []).map((ex) => (
                        <div
                            key={ex.id}
                            className="flex gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors"
                        >
                            {ex.gifUrl ? (
                                <img
                                    src={ex.gifUrl}
                                    alt={ex.titulo}
                                    className="w-16 h-16 rounded-lg object-cover bg-slate-900 shrink-0"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-2xl select-none">
                                    🏋️
                                </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white text-sm capitalize truncate">
                                            {ex.titulo}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {ex.movementPattern && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-300 capitalize">
                                                    {toSpanishLabel(LABEL_TRANSLATIONS, ex.movementPattern)}
                                                </span>
                                            )}
                                            {ex.primaryMuscle && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 capitalize">
                                                    💪 {toSpanishLabel(LABEL_TRANSLATIONS, ex.primaryMuscle)}
                                                </span>
                                            )}
                                            {ex.tags?.[0] && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 capitalize">
                                                    🏋️ {toSpanishLabel(LABEL_TRANSLATIONS, ex.tags[0])}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {activeDays.filter((d) => d !== activeDay).length > 0 && (
                                            <select
                                                defaultValue=""
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        onMoveExercise(activeDay, ex.id, e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 outline-none cursor-pointer"
                                            >
                                                <option value="" disabled>Mover a…</option>
                                                {activeDays
                                                    .filter((d) => d !== activeDay)
                                                    .map((d) => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                            </select>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onRemoveExercise(activeDay, ex.id)}
                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950 rounded-lg transition-colors"
                                            title="Eliminar ejercicio"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        inputMode="numeric"
                                        placeholder="Series"
                                        value={ex.series}
                                        onChange={(e) => onUpdateExercise(activeDay, ex.id, 'series', e.target.value)}
                                        className={inputSm}
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        inputMode="numeric"
                                        placeholder="Reps"
                                        value={ex.repeticiones}
                                        onChange={(e) => onUpdateExercise(activeDay, ex.id, 'repeticiones', e.target.value)}
                                        className={inputSm}
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        inputMode="numeric"
                                        placeholder="Descanso"
                                        value={ex.descanso}
                                        onChange={(e) => onUpdateExercise(activeDay, ex.id, 'descanso', e.target.value)}
                                        className={inputSm}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Buscador rápido */}
            <div className="p-4 border-t border-slate-800 shrink-0">
                <div className="relative">
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-blue-500 transition-colors">
                        <Search size={16} className="text-slate-500 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            placeholder="Buscar ejercicio (squat, curl, press…)"
                            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
                        />
                        {isSearching && (
                            <span className="text-xs text-slate-500 shrink-0">Buscando…</span>
                        )}
                        {searchQuery && !isSearching && (
                            <button type="button" onClick={onClearSearch} className="shrink-0">
                                <X size={14} className="text-slate-500 hover:text-slate-300" />
                            </button>
                        )}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
                            {searchResults.map((ex) => (
                                <button
                                    key={ex.id}
                                    type="button"
                                    onClick={() => onAddExercise(ex)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0"
                                >
                                    {ex.gifUrl ? (
                                        <img src={ex.gifUrl} alt={ex.name} className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0" loading="lazy" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0 flex items-center justify-center text-lg">🏋️</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium capitalize truncate">{ex.name}</p>
                                        <div className="flex gap-1 mt-0.5">
                                            {ex.movementPattern && (
                                                <span className="text-xs text-blue-400 capitalize">{toSpanishLabel(LABEL_TRANSLATIONS, ex.movementPattern)}</span>
                                            )}
                                            {ex.primaryMuscle && (
                                                <span className="text-xs text-slate-500">· {toSpanishLabel(LABEL_TRANSLATIONS, ex.primaryMuscle)}</span>
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
        </div>
    );
}
