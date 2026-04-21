import {
  auth,
  createOrUpdateTrainerRoutine,
  deleteTrainerRoutineByMember,
  ensureUserClaim,
  getTrainerRoutineByMember,
  onAuthChanged,
  searchExerciseCatalog,
  subirAdjuntoRutina,
} from './firebase';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const esperarSesionEntrenador = (timeoutMs = 3500) =>
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

export async function cargarRutinaMiembro(memberId) {
  return getTrainerRoutineByMember(String(memberId || ''));
}

export const buscarCatalogoEjercicios = async ({ text, bodyPart, limitCount }) =>
  searchExerciseCatalog({ text, bodyPart, limitCount });

export async function guardarRutinaMiembro({ member, memberId, memberName, routineName, activeDays, exercisesByDay, files }) {
  // Intentar asegurar claim, pero continuar incluso si falla (puede ser un error temporal)
  const claimResult = await ensureUserClaim();
  if (!claimResult.success) {
    console.warn('⚠ ensureUserClaim falló, pero continuando:', claimResult.error);
    // No retornar error inmediatamente - intentar continuar de todas formas
  }

  await esperar(1000);
  const currentTrainer = await esperarSesionEntrenador();
  if (!currentTrainer?.uid) {
    return { success: false, error: 'Tu sesion no esta lista. Cierra y vuelve a iniciar sesion como entrenador.' };
  }

  const days = activeDays.map((day) => ({
    name: day,
    exercises: (exercisesByDay[day] || []).map((ex) => ({
      ...ex,
      exerciseRef: ex.exerciseId
        ? { id: ex.exerciseId, name: ex.titulo, movementPattern: ex.movementPattern, primaryMuscle: ex.primaryMuscle }
        : null,
    })),
  }));

  const steps = activeDays.flatMap((day) => (exercisesByDay[day] || []).map((ex) => ({
    titulo: ex.titulo,
    descripcion: ex.descripcion,
    series: ex.series,
    repeticiones: ex.repeticiones,
    descanso: ex.descanso,
    exerciseId: ex.exerciseId,
    movementPattern: ex.movementPattern,
    primaryMuscle: ex.primaryMuscle,
    day,
  })));

  const existingFiles = files.filter((f) => !(f instanceof File)).map((f) => ({
    nombre: f?.nombre || f?.name || 'Archivo',
    tipo: f?.tipo || f?.type || '',
    size: f?.size || 0,
    url: f?.url || '',
    storagePath: f?.storagePath || '',
  }));

  const uploadedFiles = [];
  const skippedFiles = [];
  const newFiles = files.filter((f) => f instanceof File);
  for (const file of newFiles) {
    const uploadResult = await subirAdjuntoRutina(file, String(memberId), currentTrainer.uid);
    if (!uploadResult.success) {
      if (uploadResult.code === 'storage/unauthorized') {
        skippedFiles.push(file.name);
        continue;
      }
      // No retornar error inmediatamente - permitir guardar rutina sin archivos
      console.warn('⚠ No se pudo subir archivo:', file.name, uploadResult.error);
      skippedFiles.push(file.name);
      continue;
    }
    uploadedFiles.push({ nombre: file.name, tipo: file.type, size: file.size, url: uploadResult.url, storagePath: uploadResult.path });
  }

  const payload = {
    memberId: String(memberId),
    memberName,
    memberEmail: member?.email || '',
    memberAuthUid: member?.authUid || '',
    memberUserId: member?.userId || '',
    routineName: String(routineName || '').trim(),
    days,
    steps,
    files: [...existingFiles, ...uploadedFiles],
    createdBy: currentTrainer.uid,
    trainerEmail: currentTrainer.email || '',
  };

  const result = await createOrUpdateTrainerRoutine(payload);
  return {
    ...result,
    files: payload.files,
    skippedFiles,
  };
}

export const eliminarRutinaMiembro = async (memberId) => deleteTrainerRoutineByMember(String(memberId || ''));