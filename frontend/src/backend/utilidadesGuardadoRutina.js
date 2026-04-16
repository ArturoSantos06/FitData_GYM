export const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const esperarSesionEntrenador = (auth, onAuthChanged, timeoutMs = 3500) =>
  new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    let finalizado = false;
    const unsubscribe = onAuthChanged((user) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(user || null);
    });

    const timeoutId = setTimeout(() => {
      if (finalizado) return;
      finalizado = true;
      unsubscribe();
      resolve(auth.currentUser || null);
    }, timeoutMs);
  });

const esEnteroPositivo = (value) => /^\d+$/.test(String(value || '').trim()) && Number(value) > 0;

export const validarFormularioRutina = ({ files, routineName, activeDays, exercisesByDay, setActiveDay }) => {
  const hayArchivosAdjuntos = Array.isArray(files) && files.length > 0;

  const nombreNormalizado = String(routineName || '').trim();
  if (!nombreNormalizado) return { area: 'routineName', message: 'Ingresa el nombre de la rutina.' };

  if (!Array.isArray(activeDays) || activeDays.length === 0) return { area: 'days', message: 'Selecciona al menos un día de entrenamiento.' };

  const ejerciciosTotales = activeDays.flatMap((day) => exercisesByDay[day] || []);
  // Se requieren ejercicios solo si no hay archivos adjuntos
  if (ejerciciosTotales.length === 0 && !hayArchivosAdjuntos) {
    return { area: 'exercises', message: 'Agrega al menos un ejercicio o archivos adjuntos antes de guardar.' };
  }

  // Validar ejercicios si hay
  for (const day of activeDays) {
    const ejerciciosDia = exercisesByDay[day] || [];
    for (let i = 0; i < ejerciciosDia.length; i += 1) {
      const ex = ejerciciosDia[i];
      const etiqueta = `(${day} - ejercicio ${i + 1})`;

      if (!String(ex.titulo || '').trim()) {
        setActiveDay(day);
        return { area: 'exercises', message: `Falta el nombre del ejercicio ${etiqueta}.` };
      }
      if (!esEnteroPositivo(ex.series)) {
        setActiveDay(day);
        return { area: 'exercises', message: `Series inválidas ${etiqueta}. Usa un número entero mayor a 0.` };
      }
      if (!esEnteroPositivo(ex.repeticiones)) {
        setActiveDay(day);
        return { area: 'exercises', message: `Repeticiones inválidas ${etiqueta}. Usa un número entero mayor a 0.` };
      }
      if (!esEnteroPositivo(ex.descanso)) {
        setActiveDay(day);
        return { area: 'exercises', message: `Descanso inválido ${etiqueta}. Usa segundos en número entero mayor a 0.` };
      }
    }
  }

  return { area: null, message: '' };
};