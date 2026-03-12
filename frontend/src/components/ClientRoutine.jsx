import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Clock,
  Download,
  Dumbbell,
  FileText,
  Image as ImageIcon,
  IterationCcw,
  Layers,
  RefreshCw,
  User,
  Zap,
} from 'lucide-react';
import {
  auth,
  getMemberByAuthUid,
  getMemberByUserId,
  storage,
  getUser,
  getUserByAuthUid,
  subscribeTrainerRoutineByMember,
} from '../firebase';
import { getDownloadURL, listAll, ref } from 'firebase/storage';

function formatDateTime(value) {
  if (!value) return 'Sin fecha';
  try {
    const dateValue = value?.toDate?.() || new Date(value);
    if (Number.isNaN(dateValue.getTime())) return 'Sin fecha';
    return dateValue.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

const MUSCLE_TRANSLATIONS = {
  pectorals: 'Pectorales',
  delts: 'Deltoides',
  biceps: 'Biceps',
  triceps: 'Triceps',
  lats: 'Dorsales',
  glutes: 'Gluteos',
  quads: 'Cuadriceps',
  hamstrings: 'Isquiotibiales',
  calves: 'Pantorrillas',
  abs: 'Abdominales',
  forearms: 'Antebrazos',
  traps: 'Trapecios',
};

const EXERCISE_TEXT_REPLACEMENTS = [
  [/\bone arm\b/gi, 'un brazo'],
  [/\bshoulders\b/gi, 'deltoides'],
  [/\bshoulder\b/gi, 'deltoides'],
  [/\bshoulder-width\b/gi, 'ancho de hombros'],
  [/\bpress\b/gi, 'press'],
  [/\bstanding\b/gi, 'de pie'],
  [/\bcable\b/gi, 'cable'],
  [/\bexternal rotation\b/gi, 'rotacion externa'],
  [/\bhold\b/gi, 'sostener'],
  [/\braise\b/gi, 'elevacion'],
  [/\bbench\b/gi, 'banco'],
  [/\bdumbbell\b/gi, 'mancuerna'],
  [/\bbarbell\b/gi, 'barra'],
  [/\breps?\b/gi, 'repeticiones'],
  [/\bsets?\b/gi, 'series'],
  [/\brest\b/gi, 'descanso'],
  [/\bStep\s*:?\s*(\d+)\b/gi, 'Paso $1'],
];

function toSpanishExerciseText(value) {
  if (!value || typeof value !== 'string') return value || '';
  let output = value;
  EXERCISE_TEXT_REPLACEMENTS.forEach(([pattern, replacement]) => {
    output = output.replace(pattern, replacement);
  });
  return output;
}

function hasEnglishRemainder(text) {
  if (!text) return false;
  return /\b(the|and|with|your|for|from|until|while|slowly|then|keep|repeat|start|starting|position|pause|moment|fully|extended|overhead|arm|hand|feet|width|facing|forward|apart|step)\b/i.test(text);
}

function toSpanishMuscle(value) {
  if (!value) return '';
  const key = String(value).trim().toLowerCase();
  return MUSCLE_TRANSLATIONS[key] || value;
}

function StatBadge({ icon: Icon, label, value, color }) {
  const colorMap = {
    blue: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    violet: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    amber: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  };
  return (
    <div className={`inline-flex flex-col items-center gap-1 rounded-xl border px-4 py-2 min-w-20 ${colorMap[color] || colorMap.blue}`}>
      {React.createElement(Icon, { size: 14 })}
      <span className="font-bold text-base leading-none">{value || '—'}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );
}

function ExerciseCard({ step, index }) {
  const colors = [
    'from-blue-600 to-cyan-500',
    'from-violet-600 to-purple-500',
    'from-emerald-600 to-teal-500',
    'from-orange-500 to-amber-400',
    'from-pink-600 to-rose-500',
    'from-sky-600 to-blue-400',
  ];
  const gradient = colors[index % colors.length];
  const displayPrimaryMuscle = toSpanishMuscle(step.primaryMuscle);
  const translatedTitle = toSpanishExerciseText(step.titulo || '');
  const translatedDescription = toSpanishExerciseText(step.descripcion || '');
  const displayTitle = hasEnglishRemainder(translatedTitle)
    ? `Ejercicio de ${displayPrimaryMuscle || 'entrenamiento'}`
    : (translatedTitle || 'Ejercicio sin nombre');

  const displayDescription = translatedDescription && !hasEnglishRemainder(translatedDescription)
    ? translatedDescription
    : [
        displayPrimaryMuscle ? `Enfoque principal: ${displayPrimaryMuscle}.` : null,
        'Mantén una postura estable, ejecuta el movimiento de forma controlada y cuida la respiración durante cada repetición.'
      ].filter(Boolean).join(' ');

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 hover:border-slate-700 transition-colors">
      {/* GIF o número */}
      {step.gifUrl ? (
        <img
          src={step.gifUrl}
          alt={displayTitle}
          loading="lazy"
          className="shrink-0 w-16 h-16 rounded-xl object-cover bg-slate-800"
        />
      ) : (
        <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br ${gradient} text-white font-bold text-sm shadow-lg`}>
          {index + 1}
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        {/* Título + músculo */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-white text-sm leading-tight">
            {displayTitle}
          </h3>
          {displayPrimaryMuscle && (
            <span className="shrink-0 text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5">
              {displayPrimaryMuscle}
            </span>
          )}
        </div>

        {/* Descripción */}
        {displayDescription && (
          <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{displayDescription}</p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {step.series && (
            <StatBadge icon={Layers} label="Series" value={step.series} color="blue" />
          )}
          {step.repeticiones && (
            <StatBadge icon={IterationCcw} label="Repeticiones" value={step.repeticiones} color="violet" />
          )}
          {step.descanso && (
            <StatBadge icon={Clock} label="Descanso" value={step.descanso} color="emerald" />
          )}
        </div>
      </div>
    </div>
  );
}

function ClientRoutine() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [resolvedFileUrls, setResolvedFileUrls] = useState({});

  useEffect(() => {
    let routineUnsubscribe = null;

    const loadRoutine = async (firebaseUser) => {
      if (!firebaseUser) {
        setMember(null);
        setRoutine(null);
        setSelectedDay(null);
        setLoading(false);
        return;
      }

      let resolvedMember = null;

      const byAuthUid = await getMemberByAuthUid(firebaseUser.uid);
      if (byAuthUid.success) {
        resolvedMember = byAuthUid.data;
      } else {
        let internalUserId = firebaseUser.uid;

        const byDocId = await getUser(firebaseUser.uid);
        if (byDocId.success) {
          internalUserId = byDocId.data.id;
        } else {
          const byAuthUser = await getUserByAuthUid(firebaseUser.uid);
          if (byAuthUser.success) {
            internalUserId = byAuthUser.data.id;
          }
        }

        const memberByUser = await getMemberByUserId(internalUserId);
        if (memberByUser.success) {
          resolvedMember = memberByUser.data;
        }
      }

      setMember(resolvedMember);

      if (resolvedMember) {
        if (routineUnsubscribe) {
          routineUnsubscribe();
          routineUnsubscribe = null;
        }

        routineUnsubscribe = subscribeTrainerRoutineByMember(resolvedMember.id, (nextRoutine) => {
          setRoutine(nextRoutine);
        });
      } else {
        setRoutine(null);
      }

      setLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setLoading(true);
      loadRoutine(user);
    });

    return () => {
      unsubscribe();
      if (routineUnsubscribe) {
        routineUnsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveFileUrls = async () => {
      const currentFiles = Array.isArray(routine?.files) ? routine.files : [];
      if (!member?.id || currentFiles.length === 0) {
        if (!cancelled) setResolvedFileUrls({});
        return;
      }

      const nextUrls = {};
      const needsFolderLookup = currentFiles.some((file) => !file?.url && !file?.storagePath);
      let folderItems = [];

      if (needsFolderLookup) {
        try {
          const folderRef = ref(storage, `trainerRoutines/${member.id}`);
          const listed = await listAll(folderRef);
          folderItems = listed.items || [];
        } catch {
          folderItems = [];
        }
      }

      await Promise.all(currentFiles.map(async (file, index) => {
        const explicitUrl = file?.url || file?.downloadURL || '';
        if (explicitUrl) {
          nextUrls[index] = explicitUrl;
          return;
        }

        const directPath = file?.storagePath || file?.path || '';
        if (directPath) {
          try {
            nextUrls[index] = await getDownloadURL(ref(storage, directPath));
            return;
          } catch {
            // Intentar fallback por listado de carpeta.
          }
        }

        if (folderItems.length > 0) {
          const rawName = String(file?.nombre || file?.name || '').trim().toLowerCase();
          if (!rawName) return;

          const normalizedName = rawName.replace(/\s+/g, '_');
          const matched = folderItems.find((item) => {
            const itemName = String(item?.name || '').toLowerCase();
            return itemName === rawName ||
              itemName.endsWith(`_${normalizedName}`) ||
              itemName.endsWith(normalizedName) ||
              itemName.includes(normalizedName);
          });

          if (matched) {
            try {
              nextUrls[index] = await getDownloadURL(matched);
            } catch {
              // Mantener sin URL si falla.
            }
          }
        }
      }));

      if (!cancelled) {
        setResolvedFileUrls(nextUrls);
      }
    };

    resolveFileUrls();

    return () => {
      cancelled = true;
    };
  }, [routine, member]);

  const memberName = useMemo(() => {
    if (!member) return 'Cliente';
    return `${member.nombre || ''} ${member.apellido || ''}`.trim() || 'Cliente';
  }, [member]);

  const daysWithExercises = useMemo(() => {
    if (!routine?.days) return [];
    return routine.days.filter((d) => Array.isArray(d.exercises) && d.exercises.length > 0);
  }, [routine]);

  const stats = useMemo(() => {
    if (daysWithExercises.length > 0) {
      const allExercises = daysWithExercises.flatMap((d) => d.exercises);
      const totalSeries = allExercises.reduce((acc, s) => {
        const n = parseInt(s.series, 10);
        return acc + (Number.isNaN(n) ? 0 : n);
      }, 0);
      return { exercises: allExercises.length, totalSeries, days: daysWithExercises.length };
    }
    const steps = routine?.steps || [];
    const totalSeries = steps.reduce((acc, s) => {
      const n = parseInt(s.series, 10);
      return acc + (Number.isNaN(n) ? 0 : n);
    }, 0);
    return { exercises: steps.length, totalSeries, days: 0 };
  }, [routine, daysWithExercises]);

  /* ---- Estados vacíos ---- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
        <RefreshCw size={28} className="animate-spin" />
        <p className="text-sm">Cargando tu plan de entrenamiento…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-2xl p-6 max-w-2xl mx-auto text-center space-y-2">
        <User size={32} className="mx-auto opacity-60" />
        <p className="font-semibold text-lg">Perfil no encontrado</p>
        <p className="text-slate-300 text-sm">Inicia sesión nuevamente o solicita apoyo en recepción.</p>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto">
          <ClipboardList size={28} className="text-slate-500" />
        </div>
        <div>
          <p className="font-semibold text-white text-lg">Sin rutina asignada</p>
          <p className="text-slate-400 text-sm mt-1">
            Tu entrenador aún no ha configurado tu plan de entrenamiento.<br />
            Pronto aparecerá aquí.
          </p>
        </div>
      </div>
    );
  }

  const steps = routine.steps || [];
  const hasFiles = Array.isArray(routine.files) && routine.files.length > 0;
  const activeDay = selectedDay || daysWithExercises[0]?.name;
  const activeDayObj = daysWithExercises.find((d) => d.name === activeDay) || daysWithExercises[0];

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ---- Header ---- */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-linear-to-br from-slate-900 via-slate-900 to-blue-950 p-5 md:p-7">
        {/* Decoración de fondo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-blue-600/10 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-violet-600/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-400 mb-2">
              <Activity size={13} />
              Plan de entrenamiento
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
              {routine.routineName || 'Mi Rutina'}
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
            <p className="text-xs text-slate-300 font-medium">
              {formatDateTime(routine.updatedAt || routine.createdAt)}
            </p>
            {routine.trainerEmail && (
              <p className="text-xs text-slate-500 flex items-center gap-1 justify-end mt-1">
                <Dumbbell size={12} />
                {routine.trainerEmail}
              </p>
            )}
          </div>
        </div>

        {/* Resumen de estadísticas */}
        <div className="relative mt-5 flex flex-wrap gap-3">
          <StatBadge icon={Dumbbell} label="Ejercicios" value={stats.exercises} color="blue" />
          {stats.days > 0 && (
            <StatBadge icon={CalendarDays} label="Días" value={stats.days} color="violet" />
          )}
          {stats.days === 0 && stats.totalSeries > 0 && (
            <StatBadge icon={Layers} label="Series tot." value={stats.totalSeries} color="violet" />
          )}
          {hasFiles && (
            <StatBadge icon={FileText} label="Archivos" value={routine.files.length} color="amber" />
          )}
          <StatBadge icon={Zap} label="Estado" value="Activa" color="emerald" />
        </div>
      </div>

      {/* ---- Plan semanal (por días) o lista plana ---- */}
      {daysWithExercises.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Tabs de días */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 overflow-x-auto">
            <CalendarDays size={16} className="text-blue-400 shrink-0" />
            <div className="flex gap-1.5">
              {daysWithExercises.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => setSelectedDay(d.name)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeDay === d.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {d.name}
                  <span className={`ml-1.5 text-[10px] ${activeDay === d.name ? 'text-blue-200' : 'text-slate-500'}`}>
                    {d.exercises.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ejercicios del día activo */}
          {activeDayObj && (
            <div className="p-4 md:p-5 space-y-3">
              {activeDayObj.exercises.map((ex, index) => (
                <ExerciseCard
                  key={ex.id || `${index}-${ex.titulo || 'ex'}`}
                  step={ex}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      ) : steps.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
            <Dumbbell size={18} className="text-blue-400" />
            <span className="font-bold text-white text-base">Ejercicios</span>
            <span className="ml-auto text-xs text-slate-500 bg-slate-800 rounded-full px-2.5 py-0.5">
              {steps.length} {steps.length === 1 ? 'ejercicio' : 'ejercicios'}
            </span>
          </div>

          <div className="p-4 md:p-5 space-y-3">
            {steps.map((step, index) => (
              <ExerciseCard
                key={step.id || `${index}-${step.titulo || 'paso'}`}
                step={step}
                index={index}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* ---- Archivos adjuntos ---- */}
      {hasFiles && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
            <FileText size={18} className="text-amber-400" />
            <span className="font-bold text-white text-base">Material de apoyo</span>
            <span className="ml-auto text-xs text-slate-500 bg-slate-800 rounded-full px-2.5 py-0.5">
              {routine.files.length} {routine.files.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </div>

          <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {routine.files.map((file, idx) => {
              const isPdf = file.tipo === 'application/pdf';
              const sizeKB = file.size ? `${(file.size / 1024).toFixed(0)} KB` : null;
              const downloadUrl = file.url || resolvedFileUrls[idx] || '';
              const canDownload = Boolean(downloadUrl);
              return (
                <div
                  key={`${file.nombre || 'archivo'}-${idx}`}
                  className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors"
                >
                  <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-500/15 text-red-400' : 'bg-sky-500/15 text-sky-400'}`}>
                    {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{file.nombre || 'Archivo'}</p>
                    {sizeKB && <p className="text-slate-500 text-xs">{sizeKB}</p>}
                  </div>
                  {canDownload ? (
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={file.nombre || undefined}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-colors"
                    >
                      <Download size={13} />
                      Descargar
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-500">No disponible</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientRoutine;
