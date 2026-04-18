import { useRef, useState } from 'react';
import { buscarCatalogoEjercicios } from './servicioRutinasEntrenador';
import { DIAS_SEMANA, crearEntradaEjercicio } from './utilidadesRutinaEntrenador';

export default function useRutinaInteracciones({
  activeDays,
  setActiveDays,
  activeDay,
  setActiveDay,
  exercisesByDay,
  setExercisesByDay,
  setFormErrors,
  setFiles,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [catalogBodyPart, setCatalogBodyPart] = useState('');
  const [catalogExercises, setCatalogExercises] = useState([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  const searchTimeoutRef = useRef(null);
  const catalogCacheRef = useRef({});

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
      const next = [...activeDays, day].sort((a, b) => DIAS_SEMANA.indexOf(a) - DIAS_SEMANA.indexOf(b));
      setActiveDays(next);
      setExercisesByDay((prev) => ({ ...prev, [day]: [] }));
    }
    setFormErrors((prev) => ({ ...prev, days: '', exercises: '' }));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const result = await buscarCatalogoEjercicios({ text: query, limitCount: 8 });
      setSearchResults(result.success ? result.data : []);
      setIsSearching(false);
    }, 300);
  };

  const fetchCatalog = async (bodyPart) => {
    setCatalogBodyPart(bodyPart);
    if (catalogCacheRef.current[bodyPart]) {
      setCatalogExercises(catalogCacheRef.current[bodyPart]);
      return;
    }

    setCatalogExercises([]);
    setIsCatalogLoading(true);
    try {
      const result = await buscarCatalogoEjercicios({ bodyPart, limitCount: 20 });
      const final = result?.success && Array.isArray(result.data) ? result.data : [];
      if (final.length > 0) catalogCacheRef.current[bodyPart] = final;
      setCatalogExercises(final);
    } catch {
      setCatalogExercises([]);
    }
    setIsCatalogLoading(false);
  };

  const addExercise = (ex) => {
    setExercisesByDay((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), crearEntradaEjercicio(ex)],
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

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const allowed = selected.filter((f) => f.type === 'application/pdf' || f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...allowed]);
    event.target.value = '';
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    catalogBodyPart,
    catalogExercises,
    isCatalogLoading,
    toggleDay,
    handleSearch,
    clearSearch,
    fetchCatalog,
    addExercise,
    removeExercise,
    updateExercise,
    moveExercise,
    handleFileChange,
  };
}