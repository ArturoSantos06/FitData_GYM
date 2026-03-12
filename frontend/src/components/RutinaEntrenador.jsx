import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Upload, FileText,
  Image as ImageIcon, Search, X, BookOpen,
} from 'lucide-react';
import {
  auth,
  ensureUserClaim,
  createOrUpdateTrainerRoutine,
  deleteTrainerRoutineByMember,
  getTrainerRoutineByMember,
  searchExerciseCatalog,
  uploadRoutineAttachment
} from '../firebase';

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const BODY_PARTS = [
  { key: 'chest',       label: 'Pecho'       },
  { key: 'back',        label: 'Espalda'     },
  { key: 'upper arms',  label: 'Brazos'      },
  { key: 'lower arms',  label: 'Antebrazos'  },
  { key: 'upper legs',  label: 'Piernas'     },
  { key: 'lower legs',  label: 'Pantorrillas'},
  { key: 'shoulders',   label: 'Hombros'     },
  { key: 'waist',       label: 'Abdomen'     },
  { key: 'cardio',      label: 'Cardio'      },
];

const LABEL_TRANSLATIONS = {
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
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  waist: 'Abdomen',
  cardio: 'Cardio',
  'upper arms': 'Brazos',
  'lower arms': 'Antebrazos',
  'upper legs': 'Piernas',
  'lower legs': 'Pantorrillas',
  cable: 'Cable',
  barbell: 'Barra',
  dumbbell: 'Mancuerna',
  kettlebell: 'Pesa rusa',
  bands: 'Bandas',
  'body weight': 'Peso corporal',
  'assisted body weight': 'Peso corporal asistido',
  'leverage machine': 'Maquina de palanca',
  'smith machine': 'Maquina Smith',
};

const toSpanishLabel = (value) => {
  if (!value) return '';
  const key = String(value).trim().toLowerCase();
  return LABEL_TRANSLATIONS[key] || value;
};

const DEFAULT_ACTIVE_DAYS = ['Lunes', 'Miércoles', 'Viernes'];
const DEFAULT_EXERCISES_BY_DAY = { Lunes: [], Miércoles: [], Viernes: [] };

const normalizeStoredExercise = (ex = {}) => ({
  ...createExerciseEntry(),
  ...ex,
  id: ex.id || Date.now() + Math.random(),
  titulo: ex.titulo || ex.name || '',
  exerciseId: ex.exerciseId || ex.id || '',
  movementPattern: ex.movementPattern || '',
  primaryMuscle: ex.primaryMuscle || '',
  secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
  tags: Array.isArray(ex.tags) ? ex.tags : [],
  gifUrl: ex.gifUrl || null,
  instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
  descripcion: ex.descripcion || '',
  series: ex.series || '',
  repeticiones: ex.repeticiones || '',
  descanso: ex.descanso || '',
});

const createExerciseEntry = (ex = {}) => ({
  id: Date.now() + Math.random(),
  titulo: ex.name || '',
  exerciseId: ex.id || '',
  movementPattern: ex.movementPattern || '',
  primaryMuscle: ex.primaryMuscle || '',
  secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
  tags: Array.isArray(ex.tags) ? ex.tags : [],
  gifUrl: ex.gifUrl || null,
  instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
  descripcion:
    Array.isArray(ex.instructions) && ex.instructions.length
      ? ex.instructions.map((l, i) => `${i + 1}. ${l}`).join('\n')
      : '',
  series: '',
  repeticiones: '',
  descanso: '',
});

function RutinaEntrenador() {
  const navigate = useNavigate();
  const location = useLocation();
  const { memberId } = useParams();

  const member = location.state?.member || null;
  const memberName = useMemo(() => {
    if (!member) return `Alumno #${memberId}`;
    return `${member.nombre || ''} ${member.apellido || ''}`.trim() || `Alumno #${memberId}`;
  }, [member, memberId]);

  const [routineName, setRoutineName] = useState('');
  const [activeDays, setActiveDays] = useState(['Lunes', 'Miércoles', 'Viernes']);
  const [exercisesByDay, setExercisesByDay] = useState({ Lunes: [], Miércoles: [], Viernes: [] });
  const [activeDay, setActiveDay] = useState('Lunes');

  // Búsqueda rápida
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Catálogo por grupo muscular
  const [catalogBodyPart, setCatalogBodyPart] = useState('');
  const [catalogExercises, setCatalogExercises] = useState([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  const [files, setFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(true);
  const [formErrors, setFormErrors] = useState({
    routineName: '',
    days: '',
    exercises: '',
    save: '',
    delete: '',
  });
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  // Caché por grupo muscular (evita repetir requests)
  const catalogCacheRef = useRef({});

  useEffect(() => {
    let mounted = true;

    const loadRoutine = async () => {
      setIsLoadingRoutine(true);

      // Refrescar el claim de rol en el token para que las reglas de Firestore lo reconozcan
      // (necesario cuando el entrenador tiene una sesión persistida sin el claim activo)
      await ensureUserClaim();

      const result = await getTrainerRoutineByMember(String(memberId || ''));

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
          const dayName = String(dayObj.name);
          dayMap[dayName] = Array.isArray(dayObj.exercises)
            ? dayObj.exercises.map((ex) => normalizeStoredExercise(ex))
            : [];
        });

        const orderedDays = WEEK_DAYS.filter((day) => dayMap[day] !== undefined);
        if (orderedDays.length > 0) {
          setActiveDays(orderedDays);
          setExercisesByDay(dayMap);
          setActiveDay(orderedDays[0]);
        }
      } else if (Array.isArray(routine.steps) && routine.steps.length > 0) {
        const grouped = {};
        routine.steps.forEach((step) => {
          const dayName = WEEK_DAYS.includes(step?.day) ? step.day : 'Lunes';
          if (!grouped[dayName]) grouped[dayName] = [];
          grouped[dayName].push(normalizeStoredExercise(step));
        });
        const orderedDays = WEEK_DAYS.filter((day) => grouped[day] !== undefined);
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
  }, [memberId]);


  // ── Días ──────────────────────────────────────────────────────────────────
  const toggleDay = (day) => {
    if (activeDays.includes(day)) {
      if (activeDays.length === 1) return;
      const remaining = activeDays.filter((d) => d !== day);
      setActiveDays(remaining);
      setExercisesByDay((prev) => {
        const next = { ...prev };
        delete next[day];
        return next;
      });
      if (activeDay === day) setActiveDay(remaining[0]);
    } else {
      const next = [...activeDays, day].sort(
        (a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b)
      );
      setActiveDays(next);
      setExercisesByDay((prev) => ({ ...prev, [day]: [] }));
    }
    setFormErrors((prev) => ({ ...prev, days: '', exercises: '' }));
  };

  // ── Búsqueda rápida ───────────────────────────────────────────────────────
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const result = await searchExerciseCatalog({ text: query, limitCount: 8 });
      setSearchResults(result.success ? result.data : []);
      setIsSearching(false);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };

  // ── Catálogo ──────────────────────────────────────────────────────────────
  const fetchCatalog = async (bodyPart) => {
    setCatalogBodyPart(bodyPart);

    if (catalogCacheRef.current[bodyPart]) {
      setCatalogExercises(catalogCacheRef.current[bodyPart]);
      return;
    }

    setCatalogExercises([]);
    setIsCatalogLoading(true);

    const mapEx = (ex) => ({
      id: ex.exerciseId || String(ex.id) || '',
      name: ex.name || '',
      movementPattern: ex.bodyParts?.[0] || '',
      primaryMuscle: ex.targetMuscles?.[0] || '',
      secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
      tags: Array.isArray(ex.equipments) ? ex.equipments : [],
      gifUrl: ex.gifUrl || null,
      instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
    });

    try {
      const response = await fetch(
        `https://exercisedb.dev/api/v1/bodyparts/${encodeURIComponent(bodyPart)}/exercises?limit=20&offset=0`
      );
      const json = await response.json();
      const final = (Array.isArray(json?.data) ? json.data : []).slice(0, 20).map(mapEx);
      if (final.length > 0) {
        catalogCacheRef.current[bodyPart] = final;
      }
      setCatalogExercises(final);
    } catch {
      setCatalogExercises([]);
    }
    setIsCatalogLoading(false);
  };

  // ── Ejercicios ────────────────────────────────────────────────────────────
  const addExercise = (ex) => {
    setExercisesByDay((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), createExerciseEntry(ex)],
    }));
    clearSearch();
    setFormErrors((prev) => ({ ...prev, exercises: '', save: '' }));
  };

  const removeExercise = (dayName, exId) => {
    setExercisesByDay((prev) => ({
      ...prev,
      [dayName]: prev[dayName].filter((e) => e.id !== exId),
    }));
  };

  const updateExercise = (dayName, exId, field, value) => {
    setExercisesByDay((prev) => ({
      ...prev,
      [dayName]: prev[dayName].map((e) => (e.id === exId ? { ...e, [field]: value } : e)),
    }));
    setFormErrors((prev) => ({ ...prev, exercises: '', save: '' }));
  };

  const moveExercise = (fromDay, exId, toDay) => {
    const ex = exercisesByDay[fromDay]?.find((e) => e.id === exId);
    if (!ex) return;
    setExercisesByDay((prev) => ({
      ...prev,
      [fromDay]: prev[fromDay].filter((e) => e.id !== exId),
      [toDay]: [...(prev[toDay] || []), ex],
    }));
  };

  // ── Archivos ──────────────────────────────────────────────────────────────
  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const allowed = selected.filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    setFiles((prev) => [...prev, ...allowed]);
    event.target.value = '';
  };

  const isPositiveInteger = (value) => /^\d+$/.test(String(value || '').trim()) && Number(value) > 0;

  const clearMessages = () => {
    setFormSuccessMessage('');
    setFormErrors({
      routineName: '',
      days: '',
      exercises: '',
      save: '',
      delete: '',
    });
  };

  const validateRoutineForm = () => {
    const hasAttachedFiles = Array.isArray(files) && files.length > 0;
    if (hasAttachedFiles) {
      return { area: null, message: '' };
    }

    const normalizedRoutineName = String(routineName || '').trim();
    if (!normalizedRoutineName) {
      return { area: 'routineName', message: 'Ingresa el nombre de la rutina.' };
    }

    if (!Array.isArray(activeDays) || activeDays.length === 0) {
      return { area: 'days', message: 'Selecciona al menos un día de entrenamiento.' };
    }

    const allExercises = activeDays.flatMap((day) => exercisesByDay[day] || []);
    if (allExercises.length === 0) {
      return { area: 'exercises', message: 'Agrega al menos un ejercicio antes de guardar.' };
    }

    for (const day of activeDays) {
      const dayExercises = exercisesByDay[day] || [];
      for (let i = 0; i < dayExercises.length; i += 1) {
        const ex = dayExercises[i];
        const label = `(${day} - ejercicio ${i + 1})`;

        if (!String(ex.titulo || '').trim()) {
          setActiveDay(day);
          return { area: 'exercises', message: `Falta el nombre del ejercicio ${label}.` };
        }
        if (!isPositiveInteger(ex.series)) {
          setActiveDay(day);
          return { area: 'exercises', message: `Series inválidas ${label}. Usa un número entero mayor a 0.` };
        }
        if (!isPositiveInteger(ex.repeticiones)) {
          setActiveDay(day);
          return { area: 'exercises', message: `Repeticiones inválidas ${label}. Usa un número entero mayor a 0.` };
        }
        if (!isPositiveInteger(ex.descanso)) {
          setActiveDay(day);
          return { area: 'exercises', message: `Descanso inválido ${label}. Usa segundos en número entero mayor a 0.` };
        }
      }
    }

    return { area: null, message: '' };
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    clearMessages();

    const formValidation = validateRoutineForm();
    if (formValidation.area) {
      setFormErrors((prev) => ({ ...prev, [formValidation.area]: formValidation.message }));
      return;
    }

    setIsSaving(true);

    const days = activeDays.map((day) => ({
      name: day,
      exercises: (exercisesByDay[day] || []).map((ex) => ({
        ...ex,
        exerciseRef: ex.exerciseId
          ? { id: ex.exerciseId, name: ex.titulo, movementPattern: ex.movementPattern, primaryMuscle: ex.primaryMuscle }
          : null,
      })),
    }));

    const steps = activeDays.flatMap((day) =>
      (exercisesByDay[day] || []).map((ex) => ({
        titulo: ex.titulo,
        descripcion: ex.descripcion,
        series: ex.series,
        repeticiones: ex.repeticiones,
        descanso: ex.descanso,
        exerciseId: ex.exerciseId,
        movementPattern: ex.movementPattern,
        primaryMuscle: ex.primaryMuscle,
        day,
      }))
    );

    const payload = {
      memberId: String(memberId),
      memberName,
      memberEmail: member?.email || '',
      memberAuthUid: member?.authUid || '',
      memberUserId: member?.userId || '',
      routineName: String(routineName || '').trim(),
      days,
      steps,
      files: [],
      createdBy: auth.currentUser?.uid || '',
      trainerEmail: auth.currentUser?.email || '',
    };

    try {
      const existingFiles = files
        .filter((f) => !(f instanceof File))
        .map((f) => ({
          nombre: f?.nombre || f?.name || 'Archivo',
          tipo: f?.tipo || f?.type || '',
          size: f?.size || 0,
          url: f?.url || '',
          storagePath: f?.storagePath || '',
        }));

      const newFiles = files.filter((f) => f instanceof File);
      const uploadedFiles = [];
      for (const file of newFiles) {
        const uploadResult = await uploadRoutineAttachment(file, String(memberId), auth.currentUser?.uid || '');
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'No se pudo subir uno de los archivos adjuntos.');
        }

        uploadedFiles.push({
          nombre: file.name,
          tipo: file.type,
          size: file.size,
          url: uploadResult.url,
          storagePath: uploadResult.path,
        });
      }

      payload.files = [...existingFiles, ...uploadedFiles];

      const result = await createOrUpdateTrainerRoutine(payload);
      if (result.success) {
        setFormSuccessMessage('Rutina guardada correctamente.');
        setFiles(payload.files.map((f) => ({
          name: f.nombre,
          type: f.tipo,
          size: f.size,
          url: f.url || '',
          storagePath: f.storagePath || '',
        })));
      } else {
        setFormErrors((prev) => ({ ...prev, save: result.error || 'No se pudo guardar la rutina.' }));
      }
    } catch {
      setFormErrors((prev) => ({ ...prev, save: 'Ocurrió un error al guardar la rutina.' }));
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
    const result = await deleteTrainerRoutineByMember(String(memberId || ''));

    if (result.success) {
      setRoutineName('');
      setActiveDays(DEFAULT_ACTIVE_DAYS);
      setExercisesByDay(DEFAULT_EXERCISES_BY_DAY);
      setActiveDay(DEFAULT_ACTIVE_DAYS[0]);
      setFiles([]);
      clearSearch();
      setFormSuccessMessage('Rutina eliminada correctamente.');
    } else {
      setFormErrors((prev) => ({ ...prev, delete: result.error || 'No se pudo eliminar la rutina.' }));
    }
    setIsDeleting(false);
  };

  const inputSm =
    'bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-slate-600 outline-none focus:ring-1 focus:ring-blue-500 transition-all';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
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

          {formSuccessMessage && (
            <div className="bg-emerald-950 border border-emerald-700 rounded-2xl px-4 py-3 text-sm text-emerald-300">
              {formSuccessMessage}
            </div>
          )}

          {(formErrors.save || formErrors.delete) && (
            <div className="bg-red-950 border border-red-700 rounded-2xl px-4 py-3 text-sm text-red-300">
              {formErrors.save || formErrors.delete}
            </div>
          )}

          {isLoadingRoutine && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-300">
              Cargando rutina existente del alumno...
            </div>
          )}

          {/* Nombre de la rutina */}
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
            {formErrors.routineName && (
              <p className="text-red-400 text-xs mt-2">{formErrors.routineName}</p>
            )}
          </div>

          {/* Selector de días */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 font-semibold">
              Días de entrenamiento
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    activeDays.includes(day)
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            {formErrors.days && (
              <p className="text-red-400 text-xs mt-3">{formErrors.days}</p>
            )}
          </div>

          {/* Panel principal: días + catálogo lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Columna izquierda: ejercicios del día ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">

              {/* Tabs de días */}
              <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950 shrink-0">
                {activeDays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setActiveDay(day)}
                    className={`shrink-0 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                      activeDay === day
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
                {formErrors.exercises && (
                  <div className="bg-red-950 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
                    {formErrors.exercises}
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
                                  {toSpanishLabel(ex.movementPattern)}
                                </span>
                              )}
                              {ex.primaryMuscle && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 capitalize">
                                  💪 {toSpanishLabel(ex.primaryMuscle)}
                                </span>
                              )}
                              {ex.tags?.[0] && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 capitalize">
                                  🏋️ {toSpanishLabel(ex.tags[0])}
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
                                    moveExercise(activeDay, ex.id, e.target.value);
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
                              onClick={() => removeExercise(activeDay, ex.id)}
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
                            onChange={(e) => updateExercise(activeDay, ex.id, 'series', e.target.value)}
                            className={inputSm}
                          />
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            placeholder="Reps"
                            value={ex.repeticiones}
                            onChange={(e) => updateExercise(activeDay, ex.id, 'repeticiones', e.target.value)}
                            className={inputSm}
                          />
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            placeholder="Descanso"
                            value={ex.descanso}
                            onChange={(e) => updateExercise(activeDay, ex.id, 'descanso', e.target.value)}
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
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Buscar ejercicio (squat, curl, press…)"
                      className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
                    />
                    {isSearching && (
                      <span className="text-xs text-slate-500 shrink-0">Buscando…</span>
                    )}
                    {searchQuery && !isSearching && (
                      <button type="button" onClick={clearSearch} className="shrink-0">
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
                          onClick={() => addExercise(ex)}
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
                                <span className="text-xs text-blue-400 capitalize">{toSpanishLabel(ex.movementPattern)}</span>
                              )}
                              {ex.primaryMuscle && (
                                <span className="text-xs text-slate-500">· {toSpanishLabel(ex.primaryMuscle)}</span>
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

            {/* ── Columna derecha: Catálogo por grupo muscular ── */}
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
                    onClick={() => fetchCatalog(bp.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      catalogBodyPart === bp.key
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
                        onClick={() => addExercise(ex)}
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
                          <div className="w-full h-28 bg-slate-800 flex items-center justify-center text-3xl">🏋️</div>
                        )}
                        <div className="p-2.5">
                          <p className="text-white text-xs font-semibold capitalize leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
                            {ex.name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ex.primaryMuscle && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 capitalize">
                                {toSpanishLabel(ex.primaryMuscle)}
                              </span>
                            )}
                            {ex.tags?.[0] && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 capitalize">
                                {toSpanishLabel(ex.tags[0])}
                              </span>
                            )}
                          </div>
                          <p className="text-blue-400 text-xs mt-1.5 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            + Agregar a {activeDay}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Archivos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
            <div className="flex items-center gap-2 text-slate-200 font-semibold mb-4">
              <Upload size={18} />
              Archivos externos (Imágenes / PDF)
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer text-sm transition-colors">
              <Upload size={16} />
              Subir archivos
              <input type="file" accept="image/*,.pdf" multiple onChange={handleFileChange} className="hidden" />
            </label>
            <div className="mt-4 space-y-2">
              {files.length === 0 && (
                <p className="text-slate-500 text-sm">No hay archivos cargados.</p>
              )}
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    {file.type === 'application/pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
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
