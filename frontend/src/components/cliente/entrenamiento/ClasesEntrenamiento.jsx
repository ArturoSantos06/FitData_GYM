import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Clock3, Dumbbell, RefreshCw, User, FileText, Layers3 } from 'lucide-react';
import { getUser, getUserByAuthUid, waitForAuthReady } from '../../../firebase';
import { cargarRutinaMiembro } from '../../../backend/servicioRutinasEntrenador';

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString('es-MX');
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Sin fecha' : parsed.toLocaleString('es-MX');
};

function ClasesEntrenamiento() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubscribed = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const firebaseUser = await waitForAuthReady();
        if (!firebaseUser) {
          if (!unsubscribed) {
            setMember(null);
            setRoutine(null);
            setLoading(false);
          }
          return;
        }

        const [byAuthUid, byDocId] = await Promise.all([
          getUserByAuthUid(firebaseUser.uid),
          getUser(firebaseUser.uid),
        ]);
        const resolvedMember = byAuthUid?.success ? byAuthUid.data : byDocId?.success ? byDocId.data : null;

        if (!resolvedMember) {
          if (!unsubscribed) {
            setMember(null);
            setRoutine(null);
            setError('No se pudo identificar tu perfil de cliente.');
            setLoading(false);
          }
          return;
        }

        const memberId = String(resolvedMember.id || resolvedMember.authUid || firebaseUser.uid || '').trim();
        const routineResult = await cargarRutinaMiembro(memberId);

        if (!unsubscribed) {
          setMember(resolvedMember);
          setRoutine(routineResult?.success ? routineResult.data : null);
          setLoading(false);
        }
      } catch (err) {
        if (!unsubscribed) {
          setError(err.message || 'No se pudieron cargar tus clases.');
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      unsubscribed = true;
    };
  }, []);

  const memberName = useMemo(() => {
    if (!member) return 'Cliente';
    const fullName = `${member.firstName || member.first_name || ''} ${member.lastName || member.last_name || ''}`.trim();
    return member.displayName || fullName || member.username || member.nombre || 'Cliente';
  }, [member]);

  const daysWithExercises = useMemo(() => {
    if (!routine?.days) return [];
    return routine.days.filter((day) => Array.isArray(day.exercises) && day.exercises.length > 0);
  }, [routine]);

  const stats = useMemo(() => {
    const exercises = daysWithExercises.flatMap((day) => day.exercises || []);
    const totalSeries = exercises.reduce((acc, step) => acc + (Number.parseInt(step.series, 10) || 0), 0);
    return {
      days: daysWithExercises.length,
      exercises: exercises.length,
      totalSeries,
      files: Array.isArray(routine?.files) ? routine.files.length : 0,
    };
  }, [daysWithExercises, routine]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
        <RefreshCw size={28} className="animate-spin" />
        <p className="text-sm">Cargando tu entrenamiento programado…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-2xl p-6 max-w-2xl mx-auto text-center space-y-2">
        <AlertCircle size={32} className="mx-auto opacity-70" />
        <p className="font-semibold text-lg">Perfil no encontrado</p>
        <p className="text-slate-300 text-sm">Inicia sesión nuevamente o solicita apoyo en recepción.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-linear-to-br from-slate-900 via-slate-900 to-blue-950 p-5 md:p-7">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-cyan-600/10 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-blue-600/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-2">
              <Dumbbell size={13} />
              Entrenamiento del cliente
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
              Mi Entrenamiento Programado
            </h2>
            <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-1">
              <User size={13} />
              {memberName}
            </p>
          </div>

          <div className="shrink-0 text-right space-y-1">
            <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
              <CalendarDays size={12} />
              Actualizado
            </p>
            <p className="text-xs text-slate-300 font-medium">{formatDateTime(routine?.updatedAt || routine?.createdAt)}</p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-3">
          <div className="px-3 py-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-sm font-semibold">
            {stats.days} días
          </div>
          <div className="px-3 py-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 text-sm font-semibold">
            {stats.exercises} ejercicios
          </div>
          <div className="px-3 py-2 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300 text-sm font-semibold">
            {stats.totalSeries} series totales
          </div>
          <div className="px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-sm font-semibold">
            {stats.files} archivos
          </div>
        </div>
      </div>

      {!routine ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto">
            <Layers3 size={28} className="text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-white text-lg">Aún no tienes entrenamiento programado</p>
            <p className="text-slate-400 text-sm mt-1">Cuando tu entrenador te asigne tu rutina, aparecerá aquí.</p>
          </div>
        </div>
      ) : daysWithExercises.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto">
            <FileText size={28} className="text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-white text-lg">Entrenamiento asignado sin bloques visibles</p>
            <p className="text-slate-400 text-sm mt-1">Tu entrenador ya configuró una rutina, pero todavía no tiene días con ejercicios.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {daysWithExercises.map((day, index) => (
            <div key={`${day.name}-${index}`} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{day.name}</h3>
                  <p className="text-slate-400 text-sm">{day.exercises.length} ejercicios programados</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="flex items-center gap-1 justify-end"><Clock3 size={12} /> Semana / sesión</p>
                </div>
              </div>

              <div className="divide-y divide-slate-800">
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div key={`${day.name}-${exerciseIndex}`} className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Dumbbell size={16} className="text-cyan-400" />
                        <p className="text-white font-semibold">{exercise.titulo || exercise.name || 'Ejercicio'}</p>
                      </div>
                      <p className="text-slate-400 text-sm max-w-2xl">{exercise.descripcion || 'Sin descripción adicional.'}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {exercise.series ? <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">{exercise.series} series</span> : null}
                      {exercise.repeticiones ? <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">{exercise.repeticiones} reps</span> : null}
                      {exercise.descanso ? <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Descanso: {exercise.descanso}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClasesEntrenamiento;
