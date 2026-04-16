import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Sparkles, Target } from 'lucide-react';

const QUESTIONS = [
  {
    id: 'goal',
    title: '¿Cuál es tu objetivo principal?',
    subtitle: 'Esta respuesta tiene el mayor peso en la recomendación.',
    options: [
      { value: 'lose_fat', label: 'Perder grasa', hint: 'Bajar porcentaje de grasa corporal.' },
      { value: 'build_muscle', label: 'Ganar masa muscular', hint: 'Subir fuerza y volumen muscular.' },
      { value: 'improve_endurance', label: 'Mejorar resistencia', hint: 'Rendir mejor en cardio o deporte.' },
      { value: 'health', label: 'Mejorar salud general', hint: 'Más energía y bienestar diario.' },
      { value: 'mobility', label: 'Movilidad y prevención', hint: 'Evitar molestias y ganar movilidad.' },
    ],
  },
  {
    id: 'level',
    title: '¿Cuál es tu nivel actual?',
    subtitle: 'Para ajustar la intensidad inicial.',
    options: [
      { value: 'beginner', label: 'Principiante', hint: 'Menos de 6 meses entrenando.' },
      { value: 'intermediate', label: 'Intermedio', hint: 'Entre 6 meses y 2 años.' },
      { value: 'advanced', label: 'Avanzado', hint: 'Más de 2 años entrenando.' },
    ],
  },
  {
    id: 'days',
    title: '¿Cuántos días por semana puedes entrenar?',
    subtitle: 'Así definimos frecuencia y volumen.',
    options: [
      { value: '2_3', label: '2 a 3 días', hint: 'Agenda limitada.' },
      { value: '4_5', label: '4 a 5 días', hint: 'Agenda balanceada.' },
      { value: '6_plus', label: '6 o más días', hint: 'Alta disponibilidad.' },
    ],
  },
  {
    id: 'session_length',
    title: '¿Cuánto dura tu sesión ideal?',
    subtitle: 'Para elegir formato de rutina.',
    options: [
      { value: '30_45', label: '30 a 45 minutos', hint: 'Entrenamientos compactos.' },
      { value: '45_60', label: '45 a 60 minutos', hint: 'Formato estándar.' },
      { value: '60_plus', label: 'Más de 60 minutos', hint: 'Mayor volumen por sesión.' },
    ],
  },
  {
    id: 'preference',
    title: '¿Qué tipo de trabajo disfrutas más?',
    subtitle: 'La adherencia mejora cuando te gusta el método.',
    options: [
      { value: 'weights', label: 'Pesas', hint: 'Trabajo de fuerza e hipertrofia.' },
      { value: 'cardio', label: 'Cardio', hint: 'Resistencia y acondicionamiento.' },
      { value: 'mixed', label: 'Mixto', hint: 'Combinación de fuerza y cardio.' },
      { value: 'functional', label: 'Funcional/movilidad', hint: 'Movimiento integral y estabilidad.' },
    ],
  },
  {
    id: 'limitation',
    title: '¿Tienes alguna limitación actual?',
    subtitle: 'Nos ayuda a priorizar seguridad.',
    options: [
      { value: 'none', label: 'Ninguna', hint: 'Sin molestias relevantes.' },
      { value: 'joint_pain', label: 'Molestias articulares', hint: 'Dolor recurrente leve/moderado.' },
      { value: 'injury_history', label: 'Historial de lesión', hint: 'Lesión previa que cuidar.' },
      { value: 'high_stress', label: 'Estrés/fatiga alta', hint: 'Recuperación limitada esta etapa.' },
    ],
  },
];

const PLAN_LIBRARY = {
  hypertrophy_strength: {
    key: 'hypertrophy_strength',
    title: 'Fuerza e Hipertrofia',
    summary: 'Ideal para desarrollar masa muscular, subir fuerza y mejorar composición corporal.',
    focus: 'Movimientos compuestos, progresión de cargas y técnica.',
    weekly: '4-5 sesiones por semana',
    session: '45-70 minutos por sesión',
  },
  fat_loss_metabolic: {
    key: 'fat_loss_metabolic',
    title: 'Pérdida de Grasa Metabólica',
    summary: 'Prioriza gasto energético, mantenimiento muscular y consistencia semanal.',
    focus: 'Circuitos de fuerza + cardio estratégico + trabajo por intervalos.',
    weekly: '4-6 sesiones por semana',
    session: '35-60 minutos por sesión',
  },
  endurance_conditioning: {
    key: 'endurance_conditioning',
    title: 'Resistencia y Acondicionamiento',
    summary: 'Pensado para elevar tu capacidad cardiovascular y rendimiento deportivo.',
    focus: 'Bloques aeróbicos, intervalos y control de zonas de esfuerzo.',
    weekly: '4-5 sesiones por semana',
    session: '40-70 minutos por sesión',
  },
  functional_mobility: {
    key: 'functional_mobility',
    title: 'Funcional y Movilidad',
    summary: 'Enfocado en salud articular, estabilidad y patrones de movimiento seguros.',
    focus: 'Control motor, movilidad activa y fuerza funcional.',
    weekly: '3-5 sesiones por semana',
    session: '30-55 minutos por sesión',
  },
};

const SCORE_RULES = {
  goal: {
    lose_fat: { fat_loss_metabolic: 5, endurance_conditioning: 2 },
    build_muscle: { hypertrophy_strength: 5 },
    improve_endurance: { endurance_conditioning: 5, fat_loss_metabolic: 1 },
    health: { functional_mobility: 3, fat_loss_metabolic: 2 },
    mobility: { functional_mobility: 5 },
  },
  level: {
    beginner: { functional_mobility: 2, fat_loss_metabolic: 1 },
    intermediate: { hypertrophy_strength: 1, endurance_conditioning: 1, fat_loss_metabolic: 1 },
    advanced: { hypertrophy_strength: 2, endurance_conditioning: 2 },
  },
  days: {
    '2_3': { functional_mobility: 2, hypertrophy_strength: 1 },
    '4_5': { hypertrophy_strength: 2, endurance_conditioning: 2, fat_loss_metabolic: 2 },
    '6_plus': { fat_loss_metabolic: 2, endurance_conditioning: 3 },
  },
  session_length: {
    '30_45': { fat_loss_metabolic: 2, functional_mobility: 1 },
    '45_60': { hypertrophy_strength: 2, endurance_conditioning: 2 },
    '60_plus': { hypertrophy_strength: 2, endurance_conditioning: 2 },
  },
  preference: {
    weights: { hypertrophy_strength: 3 },
    cardio: { endurance_conditioning: 3, fat_loss_metabolic: 2 },
    mixed: { fat_loss_metabolic: 2, hypertrophy_strength: 1, endurance_conditioning: 1 },
    functional: { functional_mobility: 3 },
  },
  limitation: {
    none: { hypertrophy_strength: 1, endurance_conditioning: 1 },
    joint_pain: { functional_mobility: 3 },
    injury_history: { functional_mobility: 4 },
    high_stress: { functional_mobility: 2, fat_loss_metabolic: 1 },
  },
};

const RESULT_ORDER = [
  'hypertrophy_strength',
  'fat_loss_metabolic',
  'endurance_conditioning',
  'functional_mobility',
];

function buildRecommendation(answers) {
  const score = {
    hypertrophy_strength: 0,
    fat_loss_metabolic: 0,
    endurance_conditioning: 0,
    functional_mobility: 0,
  };

  Object.entries(answers).forEach(([questionId, optionValue]) => {
    const questionRules = SCORE_RULES[questionId];
    if (!questionRules) {
      return;
    }

    const optionRules = questionRules[optionValue];
    if (!optionRules) {
      return;
    }

    Object.entries(optionRules).forEach(([planKey, points]) => {
      score[planKey] += points;
    });
  });

  const winner = RESULT_ORDER.reduce((bestKey, currentKey) => {
    if (score[currentKey] > score[bestKey]) {
      return currentKey;
    }
    return bestKey;
  }, RESULT_ORDER[0]);

  return {
    ...PLAN_LIBRARY[winner],
    score,
  };
}

function getStorageKey() {
  try {
    const rawUser = localStorage.getItem('firebaseUser');
    if (!rawUser) {
      return 'training-needs-analysis-anon';
    }

    const parsed = JSON.parse(rawUser);
    const uid = parsed?.uid || parsed?.user?.uid || parsed?.user_id;
    return uid ? `training-needs-analysis-${uid}` : 'training-needs-analysis-anon';
  } catch {
    return 'training-needs-analysis-anon';
  }
}

function parseStoredHistory(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    // Compatibilidad con el formato anterior (objeto único)
    if (parsed && parsed.recommendation && parsed.answers) {
      return [
        {
          id: parsed.id || Date.now(),
          completedAt: parsed.completedAt || new Date().toISOString(),
          answers: parsed.answers,
          recommendation: parsed.recommendation,
        },
      ];
    }

    return [];
  } catch {
    return [];
  }
}

function ClientTrainingNeedsAnalysis() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const storageKey = getStorageKey();
    const storedHistory = parseStoredHistory(localStorage.getItem(storageKey));
    setHistory(storedHistory);
  }, []);

  const currentQuestion = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const completion = Math.round((Object.keys(answers).length / totalSteps) * 100);

  const recommendation = useMemo(() => {
    if (!isCompleted) {
      return null;
    }
    return buildRecommendation(answers);
  }, [answers, isCompleted]);

  const handleSelect = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const canMoveNext = Boolean(answers[currentQuestion?.id]);

  const handleNext = () => {
    if (!canMoveNext) {
      return;
    }

    if (step === totalSteps - 1) {
      setIsCompleted(true);
      const storageKey = getStorageKey();

      const recommendationResult = buildRecommendation(answers);
      const entry = {
        id: Date.now(),
        answers,
        completedAt: new Date().toISOString(),
        recommendation: recommendationResult,
      };

      const currentHistory = parseStoredHistory(localStorage.getItem(storageKey));
      const updatedHistory = [entry, ...currentHistory].slice(0, 12);

      localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);

      return;
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      return;
    }
    setStep((prev) => prev - 1);
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setIsCompleted(false);
  };

  const formatHistoryDate = (value) => {
    if (!value) return 'Sin fecha';
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha';

    return parsedDate.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isCompleted && recommendation) {
    return (
      <div className="w-full max-w-3xl mx-auto animate-fade-in">
        <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-amber-400 via-orange-400 to-rose-400" />

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Tipo de entrenamiento sugerido</h2>
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-slate-400 mb-1">Recomendación principal</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-amber-300">{recommendation.title}</h3>
              </div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 text-sm border border-amber-500/30">
                <Sparkles size={15} />
                Sugerencia automática
              </span>
            </div>

            <p className="text-slate-200 mt-4 leading-relaxed">{recommendation.summary}</p>

            <div className="grid md:grid-cols-2 gap-3 mt-5">
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">Enfoque</p>
                <p className="text-slate-200 mt-1">{recommendation.focus}</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">Frecuencia sugerida</p>
                <p className="text-slate-200 mt-1">{recommendation.weekly}</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wider text-slate-400">Duración sugerida</p>
                <p className="text-slate-200 mt-1">{recommendation.session}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={restart}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold transition-colors"
            >
              <ArrowLeft size={16} />
              Volver a responder
            </button>
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold transition-colors"
              >
                <ClipboardList size={16} />
                {showHistory ? 'Ocultar historial' : `Ver historial (${history.length})`}
              </button>
            )}
            <p className="text-sm text-slate-400 self-center">
              Esta recomendación es inicial. Tu entrenador puede ajustarla según evaluación técnica.
            </p>
          </div>

          {showHistory && history.length > 0 && (
            <div className="mt-6 border border-slate-700 rounded-xl p-4 bg-slate-950/70">
              <h4 className="text-white font-bold mb-3">Historial de análisis</h4>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {history.map((entry, index) => (
                  <div key={`${entry.id}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-slate-200 font-semibold">{entry.recommendation?.title || 'Sin recomendación'}</p>
                      <p className="text-xs text-slate-400">{formatHistoryDate(entry.completedAt)}</p>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{entry.recommendation?.summary || 'Sin resumen disponible.'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-cyan-400 via-blue-400 to-indigo-400" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Análisis de Necesidades</h2>
            <p className="text-slate-400 mt-1">Responde el cuestionario para sugerir tu enfoque de entrenamiento ideal.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-sm">
            <ClipboardList size={15} />
            Paso {step + 1} de {totalSteps}
          </div>
        </div>

        {history.length > 0 && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/40 p-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-300">
              Tienes {history.length} análisis guardado{history.length === 1 ? '' : 's'}.
            </p>
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {showHistory ? 'Ocultar historial' : 'Ver historial'}
            </button>
          </div>
        )}

        {showHistory && history.length > 0 && (
          <div className="mb-6 border border-slate-700 rounded-xl p-4 bg-slate-950/70">
            <h4 className="text-white font-bold mb-3">Historial de análisis</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {history.map((entry, index) => (
                <div key={`${entry.id}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-slate-200 font-semibold">{entry.recommendation?.title || 'Sin recomendación'}</p>
                    <p className="text-xs text-slate-400">{formatHistoryDate(entry.completedAt)}</p>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{entry.recommendation?.summary || 'Sin resumen disponible.'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-linear-to-r from-cyan-400 to-blue-400 transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Avance: {completion}%</p>
        </div>

        <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 md:p-6">
          <div className="flex items-center gap-2 text-amber-300 mb-2">
            <Target size={16} />
            <span className="text-xs uppercase tracking-wider font-semibold">Pregunta activa</span>
          </div>
          <h3 className="text-xl font-bold text-white">{currentQuestion.title}</h3>
          <p className="text-slate-400 mt-1">{currentQuestion.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-3 mt-5">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(currentQuestion.id, option.value)}
                  className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/10 shadow-md shadow-cyan-900/20'
                      : 'border-slate-600 bg-slate-900/70 hover:border-cyan-500/60 hover:bg-slate-900'
                  }`}
                >
                  <p className={`font-semibold ${isSelected ? 'text-cyan-200' : 'text-slate-100'}`}>{option.label}</p>
                  <p className="text-sm text-slate-400 mt-1">{option.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Anterior
          </button>

          <button
            onClick={handleNext}
            disabled={!canMoveNext}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-500/50 bg-cyan-500/15 text-cyan-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/25 transition-colors"
          >
            {step === totalSteps - 1 ? 'Analizar respuestas' : 'Siguiente'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientTrainingNeedsAnalysis;
