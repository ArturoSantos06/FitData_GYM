import { useState } from 'react';
import {
  DIAS_ACTIVOS_POR_DEFECTO,
  EJERCICIOS_POR_DIA_POR_DEFECTO,
} from './utilidadesRutinaEntrenador';
import useCargaRutinaInicial from './useCargaRutinaInicial';
import useRutinaInteracciones from './useRutinaInteracciones';

export default function useRutinaCargaYEdicion(memberId) {
  const [routineName, setRoutineName] = useState('');
  const [activeDays, setActiveDays] = useState(DIAS_ACTIVOS_POR_DEFECTO);
  const [exercisesByDay, setExercisesByDay] = useState(EJERCICIOS_POR_DIA_POR_DEFECTO);
  const [activeDay, setActiveDay] = useState(DIAS_ACTIVOS_POR_DEFECTO[0]);
  const [files, setFiles] = useState([]);
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(true);
  const [formErrors, setFormErrors] = useState({
    routineName: '',
    days: '',
    exercises: '',
    save: '',
    delete: '',
  });
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [formWarningMessage, setFormWarningMessage] = useState('');

  useCargaRutinaInicial({
    memberId,
    setIsLoadingRoutine,
    setRoutineName,
    setActiveDays,
    setExercisesByDay,
    setActiveDay,
    setFiles,
  });

  const interacciones = useRutinaInteracciones({
    activeDays,
    setActiveDays,
    activeDay,
    setActiveDay,
    exercisesByDay,
    setExercisesByDay,
    setFormErrors,
    setFiles,
  });

  const clearMessages = () => {
    setFormSuccessMessage('');
    setFormWarningMessage('');
    setFormErrors({ routineName: '', days: '', exercises: '', save: '', delete: '' });
  };

  return {
    routineName,
    setRoutineName,
    activeDays,
    setActiveDays,
    exercisesByDay,
    setExercisesByDay,
    activeDay,
    setActiveDay,
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
    ...interacciones,
  };
}