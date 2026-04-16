import { useEffect } from 'react';
import { cargarRutinaMiembro } from './servicioRutinasEntrenador';
import { DIAS_SEMANA, normalizarEjercicioGuardado } from './utilidadesRutinaEntrenador';

export default function useCargaRutinaInicial({
  memberId,
  setIsLoadingRoutine,
  setRoutineName,
  setActiveDays,
  setExercisesByDay,
  setActiveDay,
  setFiles,
}) {
  useEffect(() => {
    let mounted = true;

    const loadRoutine = async () => {
      setIsLoadingRoutine(true);
      const result = await cargarRutinaMiembro(memberId);
      if (!mounted) return;

      if (!result.success || !result.data) {
        setIsLoadingRoutine(false);
        return;
      }

      const routine = result.data;
      setRoutineName(routine.routineName || '');

      if (Array.isArray(routine.days) && routine.days.length > 0) {
        const dayMap = {};
        routine.days.forEach((dayObj) => {
          if (!dayObj?.name) return;
          dayMap[String(dayObj.name)] = Array.isArray(dayObj.exercises)
            ? dayObj.exercises.map((ex) => normalizarEjercicioGuardado(ex))
            : [];
        });

        const orderedDays = DIAS_SEMANA.filter((day) => dayMap[day] !== undefined);
        if (orderedDays.length > 0) {
          setActiveDays(orderedDays);
          setExercisesByDay(dayMap);
          setActiveDay(orderedDays[0]);
        }
      } else if (Array.isArray(routine.steps) && routine.steps.length > 0) {
        const grouped = {};
        routine.steps.forEach((step) => {
          const dayName = DIAS_SEMANA.includes(step?.day) ? step.day : 'Lunes';
          if (!grouped[dayName]) grouped[dayName] = [];
          grouped[dayName].push(normalizarEjercicioGuardado(step));
        });

        const orderedDays = DIAS_SEMANA.filter((day) => grouped[day] !== undefined);
        if (orderedDays.length > 0) {
          setActiveDays(orderedDays);
          setExercisesByDay(grouped);
          setActiveDay(orderedDays[0]);
        }
      }

      const loadedFiles = Array.isArray(routine.files)
        ? routine.files.map((f) => ({
          name: f?.nombre || 'Archivo',
          type: f?.tipo || '',
          size: f?.size || 0,
          url: f?.url || '',
          storagePath: f?.storagePath || '',
        }))
        : [];
      setFiles(loadedFiles);
      setIsLoadingRoutine(false);
    };

    loadRoutine();
    return () => {
      mounted = false;
    };
  }, [
    memberId,
    setActiveDay,
    setActiveDays,
    setExercisesByDay,
    setFiles,
    setIsLoadingRoutine,
    setRoutineName,
  ]);
}