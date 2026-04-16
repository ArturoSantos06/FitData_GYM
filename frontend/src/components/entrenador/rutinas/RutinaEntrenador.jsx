import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BannerMensajesRutina from './BannerMensajesRutina';
import CatalogoEjerciciosRutina from './CatalogoEjerciciosRutina';
import SeccionArchivosRutina from './SeccionArchivosRutina';
import SelectorDiasRutina from './SelectorDiasRutina';
import SeccionListaEjercicios from './SeccionListaEjercicios';
import useGuardadoRutina from '../../../backend/useGuardadoRutina';
import useRutinaCargaYEdicion from '../../../backend/useRutinaCargaYEdicion';
import { DIAS_SEMANA, PARTES_CUERPO, TRADUCCIONES_ETIQUETAS } from '../../../backend/utilidadesRutinaEntrenador';

function RutinaEntrenador() {
  const navigate = useNavigate();
  const location = useLocation();
  const { memberId } = useParams();

  const member = location.state?.member || null;
  const memberName = useMemo(() => {
    if (!member) return `Alumno #${memberId}`;
    return `${member.nombre || ''} ${member.apellido || ''}`.trim() || `Alumno #${memberId}`;
  }, [member, memberId]);

  const {
    routineName,
    setRoutineName,
    activeDays,
    setActiveDays,
    exercisesByDay,
    setExercisesByDay,
    activeDay,
    setActiveDay,
    searchQuery,
    searchResults,
    isSearching,
    catalogBodyPart,
    catalogExercises,
    isCatalogLoading,
    files,
    setFiles,
    isLoadingRoutine,
    formErrors,
    setFormErrors,
    formSuccessMessage,
    setFormSuccessMessage,
    formWarningMessage,
    setFormWarningMessage,
    clearMessages,
    toggleDay,
    handleSearch,
    clearSearch,
    addExercise,
    removeExercise,
    updateExercise,
    moveExercise,
    fetchCatalog,
    handleFileChange,
  } = useRutinaCargaYEdicion(memberId);

  const { isSaving, isDeleting, handleSubmit, handleDeleteRoutine } = useGuardadoRutina({
    member,
    memberId,
    memberName,
    routineName,
    activeDays,
    exercisesByDay,
    files,
    setFiles,
    setRoutineName,
    setActiveDays,
    setExercisesByDay,
    setActiveDay,
    clearSearch,
    isLoadingRoutine,
    setFormErrors,
    clearMessages,
    setFormSuccessMessage,
    setFormWarningMessage,
  });

  const inputSm = 'bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-slate-600 outline-none focus:ring-1 focus:ring-blue-500 transition-all';

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/entrenador')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold">Rutina del Alumno</h1>
            <p className="text-slate-400 text-sm">{memberName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <BannerMensajesRutina
            formSuccessMessage={formSuccessMessage}
            formWarningMessage={formWarningMessage}
            formErrors={formErrors}
            isLoadingRoutine={isLoadingRoutine}
          />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <label className="block text-sm text-slate-300 mb-2">Nombre de la rutina</label>
            <input
              type="text"
              value={routineName}
              onChange={(e) => {
                setRoutineName(e.target.value);
                setFormErrors((prev) => ({ ...prev, routineName: '', save: '' }));
                setFormSuccessMessage('');
              }}
              placeholder="Ej. Fuerza Tren Superior – Semana 1"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required={files.length === 0}
            />
            {formErrors.routineName && <p className="text-red-400 text-xs mt-2">{formErrors.routineName}</p>}
          </div>

          <SelectorDiasRutina
            diasSemana={DIAS_SEMANA}
            activeDays={activeDays}
            toggleDay={toggleDay}
            errorDias={formErrors.days}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SeccionListaEjercicios
              activeDay={activeDay}
              activeDays={activeDays}
              exercisesByDay={exercisesByDay}
              formError={formErrors.exercises}
              searchQuery={searchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSetActiveDay={setActiveDay}
              onRemoveExercise={removeExercise}
              onUpdateExercise={updateExercise}
              onMoveExercise={moveExercise}
              onSearch={handleSearch}
              onClearSearch={clearSearch}
              onAddExercise={addExercise}
              LABEL_TRANSLATIONS={TRADUCCIONES_ETIQUETAS}
              inputSm={inputSm}
            />

            <CatalogoEjerciciosRutina
              activeDay={activeDay}
              bodyParts={PARTES_CUERPO}
              catalogBodyPart={catalogBodyPart}
              catalogExercises={catalogExercises}
              isCatalogLoading={isCatalogLoading}
              onFetchCatalog={fetchCatalog}
              onAddExercise={addExercise}
            />
          </div>

          <SeccionArchivosRutina
            files={files}
            onFileChange={handleFileChange}
            onRemoveFile={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSaving || isDeleting || isLoadingRoutine}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-colors"
            >
              {isSaving ? 'Guardando…' : 'Guardar rutina digital'}
            </button>
            <button
              type="button"
              onClick={handleDeleteRoutine}
              disabled={isSaving || isDeleting || isLoadingRoutine}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold transition-colors"
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar rutina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RutinaEntrenador;
