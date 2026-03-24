import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  auth,
  ensureUserClaim,
  onAuthChanged,
  createOrUpdateTrainerRoutine,
  deleteTrainerRoutineByMember,
  getTrainerRoutineByMember,
  searchExerciseCatalog,
  uploadRoutineAttachment
} from '../firebase';
import FormStatusMessages from './FormStatusMessages';
import DaySelector from './DaySelector';
import ExerciseListSection from './ExerciseListSection';
import CatalogSection from './CatalogSection';

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
  const [formWarningMessage, setFormWarningMessage] = useState('');
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
    setFormWarningMessage('');
    setFormErrors({
      routineName: '',
      days: '',
      exercises: '',
      save: '',
      delete: '',
    });
  };

  const waitForTrainerSession = (timeoutMs = 3500) =>
    new Promise((resolve) => {
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }

      let settled = false;
      const unsubscribe = onAuthChanged((user) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(user || null);
      });

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        resolve(auth.currentUser || null);
      }, timeoutMs);
    });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const claimResult = await ensureUserClaim();
    if (!claimResult.success) {
      setFormErrors((prev) => ({
        ...prev,
        save: claimResult.error || 'No se pudo validar la sesion del entrenador. Intenta de nuevo.',
      }));
      return;
    }

    // Da margen a la propagacion del token con claim antes de escribir en Firestore.
    await wait(1000);

    const currentTrainer = await waitForTrainerSession();
    if (!currentTrainer?.uid) {
      setFormErrors((prev) => ({
        ...prev,
        save: 'Tu sesion no esta lista. Cierra y vuelve a iniciar sesion como entrenador.',
      }));
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
      createdBy: currentTrainer.uid,
      trainerEmail: currentTrainer.email || '',
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
      const skippedFiles = [];
      for (const file of newFiles) {
        const uploadResult = await uploadRoutineAttachment(file, String(memberId), currentTrainer.uid);
        if (!uploadResult.success) {
          const isStorageUnauthorized = uploadResult.code === 'storage/unauthorized';
          if (isStorageUnauthorized) {
            skippedFiles.push(file.name);
            continue;
          }

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
        if (skippedFiles.length > 0) {
          setFormWarningMessage(
            `Se guardo la rutina, pero ${skippedFiles.length} adjunto(s) no se subieron por permisos de Storage.`
          );
        }
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
    } catch (error) {
      const message = String(error?.message || '').trim();
      setFormErrors((prev) => ({
        ...prev,
        save: message || 'Ocurrio un error al guardar la rutina.',
      }));
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

          <FormStatusMessages
            successMessage={formSuccessMessage}
            warningMessage={formWarningMessage}
            errors={formErrors}
            isLoadingRoutine={isLoadingRoutine}
          />

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
          <DaySelector
            activeDays={activeDays}
            onToggleDay={toggleDay}
            formError={formErrors.days}
          />

          {/* Panel principal: días + catálogo lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <ExerciseListSection
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
              LABEL_TRANSLATIONS={LABEL_TRANSLATIONS}
              inputSm={inputSm}
            />

            <CatalogSection
              catalogBodyPart={catalogBodyPart}
              catalogExercises={catalogExercises}
              isCatalogLoading={isCatalogLoading}
              activeDay={activeDay}
              onFetchCatalog={fetchCatalog}
              onAddExercise={addExercise}
              LABEL_TRANSLATIONS={LABEL_TRANSLATIONS}
            />
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
