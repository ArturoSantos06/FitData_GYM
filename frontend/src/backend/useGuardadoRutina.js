import { useState } from 'react';
import {
  eliminarRutinaMiembro,
  guardarRutinaMiembro,
} from './servicioRutinasEntrenador';
import {
  DIAS_ACTIVOS_POR_DEFECTO,
  EJERCICIOS_POR_DIA_POR_DEFECTO,
} from './utilidadesRutinaEntrenador';
import { validarFormularioRutina } from './utilidadesGuardadoRutina';

export default function useGuardadoRutina({
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
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    const formValidation = validarFormularioRutina({
      files,
      routineName,
      activeDays,
      exercisesByDay,
      setActiveDay,
    });
    if (formValidation.area) {
      setFormErrors((prev) => ({ ...prev, [formValidation.area]: formValidation.message }));
      return;
    }
    setIsSaving(true);

    try {
      const result = await guardarRutinaMiembro({
        member,
        memberId,
        memberName,
        routineName,
        activeDays,
        exercisesByDay,
        files,
      });
      if (result.success) {
        setFormSuccessMessage('Rutina guardada correctamente.');
        if (Array.isArray(result.skippedFiles) && result.skippedFiles.length > 0) {
          setFormWarningMessage(
            `Se guardo la rutina, pero ${result.skippedFiles.length} adjunto(s) no se subieron por permisos de Storage.`
          );
        }
        setFiles((result.files || []).map((f) => ({
          name: f.nombre || f.name || 'Archivo',
          type: f.tipo || f.type || '',
          size: f.size || 0,
          url: f.url || '',
          storagePath: f.storagePath || '',
        })));
      } else {
        setFormErrors((prev) => ({ ...prev, save: result.error || 'No se pudo guardar la rutina.' }));
      }
    } catch (error) {
      const message = String(error?.message || '').trim();
      setFormErrors((prev) => ({ ...prev, save: message || 'Ocurrio un error al guardar la rutina.' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoutine = async () => {
    const confirmDelete = window.confirm('Esta acción eliminará toda la rutina del alumno. ¿Deseas continuar?');
    if (!confirmDelete) return;
    setIsDeleting(true);
    setFormSuccessMessage('');
    setFormErrors((prev) => ({ ...prev, delete: '' }));

    const result = await eliminarRutinaMiembro(memberId);
    if (result.success) {
      setRoutineName('');
      setActiveDays(DIAS_ACTIVOS_POR_DEFECTO);
      setExercisesByDay(EJERCICIOS_POR_DIA_POR_DEFECTO);
      setActiveDay(DIAS_ACTIVOS_POR_DEFECTO[0]);
      setFiles([]);
      clearSearch();
      setFormSuccessMessage('Rutina eliminada correctamente.');
    } else {
      setFormErrors((prev) => ({ ...prev, delete: result.error || 'No se pudo eliminar la rutina.' }));
    }
    setIsDeleting(false);
  };

  return {
    isSaving,
    isDeleting,
    isLoadingRoutine,
    handleSubmit,
    handleDeleteRoutine,
  };
}