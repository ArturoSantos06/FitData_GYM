import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarDays, CheckCircle2, History, Lightbulb,
    Loader2, MessageSquareText, Sparkles, ShieldAlert, WandSparkles
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../../firebase/config';
import { buildRoutinePrompt, generateAiRoutine, subscribeAiRoutineHistory } from '../../firebase/aiRoutineService';

import VideoYouTube from './VideoYouTube';

const INITIAL_FORM = {
    goal: 'recomposition',
    level: 'beginner',
    daysPerWeek: '4',
    sessionLength: '60',
    equipment: 'gimnasio completo',
    limitations: '',
    preferences: 'rutina equilibrada con fuerza y cardio moderado',
    extraNotes: '',
};

const FIELD_STYLES = 'w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/20';

const GOAL_OPTIONS = [
    { value: 'muscle_gain', label: 'Ganar masa muscular' },
    { value: 'fat_loss', label: 'Perder grasa' },
    { value: 'strength', label: 'Mejorar fuerza' },
    { value: 'endurance', label: 'Mejorar resistencia' },
    { value: 'mobility', label: 'Movilidad y prevención' },
    { value: 'recomposition', label: 'Recomposición corporal' },
];

const LEVEL_OPTIONS = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
];

const DAYS_OPTIONS = ['2', '3', '4', '5', '6'];
const LENGTH_OPTIONS = ['30', '45', '60', '75', '90'];

function InfoPill({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
        </div>
    );
}

function formatDateTime(value) {
    if (!value) return 'Sin fecha';
    try {
        const parsedDate = value?.toDate?.() || new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return 'Sin fecha';
        return parsedDate.toLocaleString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return 'Sin fecha';
    }
}

function RoutineChatBubble({ label, content, tone = 'slate' }) {
    const toneMap = {
        slate: 'border-slate-700 bg-slate-950/80 text-slate-200',
        blue: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-50',
        fuchsia: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-50',
    };

    return (
        <div className={`rounded-2xl border px-4 py-4 ${toneMap[tone] || toneMap.slate}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{label}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{content}</p>
        </div>
    );
}

// NUEVO PARSER: Capaz de leer la Rutina de Respaldo y el JSON
function parsearRutinaIA(texto) {
    if (!texto) return null;
    
    // Intento 1: ¿Viene como JSON?
    try {
        const jsonLimpio = texto.replace(/```json/g, '').replace(/```/g, '').trim();
        const parseado = JSON.parse(jsonLimpio);
        if (parseado && parseado.dias) return parseado;
    } catch (e) {
        // Falló el JSON, seguimos con el Plan B silenciosamente
    }

    // Intento 2: Plan B. Extraer ejercicios del texto de respaldo
    const lineas = texto.split('\n');
    const ejerciciosExtraidos = [];
    let diaActual = "Ejercicios Generales"; 
    
    // Regex que busca "1. Nombre del Ejercicio - Detalles"
    const regexEjercicio = /^\d+\.\s*(.*?)\s*-\s*(.*)$/; 

    lineas.forEach(linea => {
        const lineaLimpia = linea.trim();
        
        // Detectar si la línea es un día (ej. "Lunes: Pierna y gluteo")
        if (lineaLimpia && 
            !lineaLimpia.match(/^\d+\./) && 
            lineaLimpia.includes(':') && 
            !lineaLimpia.toLowerCase().includes('objetivo') && 
            !lineaLimpia.toLowerCase().includes('nivel') &&
            !lineaLimpia.toLowerCase().includes('frecuencia') &&
            !lineaLimpia.toLowerCase().includes('duracion') &&
            !lineaLimpia.toLowerCase().includes('solicitud') &&
            !lineaLimpia.toLowerCase().includes('enfoque') &&
            !lineaLimpia.toLowerCase().includes('calentamiento')) {
            diaActual = lineaLimpia;
        }

        // Extraer el ejercicio
        const match = lineaLimpia.match(regexEjercicio); 
        
        if (match) {
            ejerciciosExtraidos.push({
                dia: diaActual,
                nombre: match[1].trim(), // ej. "Sentadilla libre"
                descripcion: match[2].trim() // ej. "4 series x 8 repeticiones"
            });
        }
    });

    // Agrupar los ejercicios por día para dibujarlos bonito
    if (ejerciciosExtraidos.length > 0) {
        const diasAgrupados = [];
        const gruposPorDia = {};

        ejerciciosExtraidos.forEach(ej => {
            if (!gruposPorDia[ej.dia]) {
                gruposPorDia[ej.dia] = [];
            }
            gruposPorDia[ej.dia].push(ej);
        });

        for (const [tituloDia, ejerciciosDelDia] of Object.entries(gruposPorDia)) {
            diasAgrupados.push({
                titulo: tituloDia,
                ejercicios: ejerciciosDelDia
            });
        }

        return {
            objetivo: "Rutina Adaptada",
            dias: diasAgrupados
        };
    }

    return null; 
}

function ClientAIRoutineGenerator() {
    const [form, setForm] = useState(INITIAL_FORM);
    const [result, setResult] = useState(null);
    const [promptPreview, setPromptPreview] = useState(buildRoutinePrompt(INITIAL_FORM));
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState('');
    const [selectedHistoryId, setSelectedHistoryId] = useState('');

    const selectedGoalLabel = useMemo(
        () => GOAL_OPTIONS.find((option) => option.value === form.goal)?.label || 'No definido',
        [form.goal]
    );

    const selectedLevelLabel = useMemo(
        () => LEVEL_OPTIONS.find((option) => option.value === form.level)?.label || 'No definido',
        [form.level]
    );

    const selectedHistory = useMemo(
        () => history.find((entry) => entry.id === selectedHistoryId) || history[0] || null,
        [history, selectedHistoryId]
    );

    const activeEntry = result?.historyEntry || selectedHistory || null;

    useEffect(() => {
        let unsubscribeHistory = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (unsubscribeHistory) {
                unsubscribeHistory();
                unsubscribeHistory = null;
            }

            if (!user) {
                setHistory([]);
                setSelectedHistoryId('');
                setHistoryLoading(false);
                return;
            }

            setHistoryLoading(true);
            unsubscribeHistory = subscribeAiRoutineHistory(
                user.uid,
                (entries) => {
                    setHistory(entries);
                    setHistoryError('');
                    setHistoryLoading(false);
                    setSelectedHistoryId((currentSelectedId) => {
                        const stillExists = entries.some((entry) => entry.id === currentSelectedId);
                        if (stillExists && currentSelectedId) return currentSelectedId;
                        return entries[0]?.id || '';
                    });
                },
                (subscriptionError) => {
                    setHistoryError(subscriptionError?.message || 'No se pudo cargar el historial.');
                    setHistoryLoading(false);
                }
            );
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeHistory) unsubscribeHistory();
        };
    }, []);

    const updateField = (field, value) => {
        setForm((prev) => {
            const nextForm = { ...prev, [field]: value };
            setPromptPreview(buildRoutinePrompt(nextForm));
            return nextForm;
        });
    };

    const handleGenerate = async (event) => {
        event.preventDefault();
        setIsGenerating(true);
        setError('');

        try {
            const promptMio = buildRoutinePrompt(form);

            const response = await generateAiRoutine({
                ...form,
                goalLabel: selectedGoalLabel,
                levelLabel: selectedLevelLabel,
                prompt: promptMio,
                customRequest: promptMio 
            });

            setResult(response);
            setSelectedHistoryId(response?.historyEntry?.id || '');
            setPromptPreview(response.prompt || promptMio);
        } catch (generationError) {
            console.error("🔥 ERROR REAL DE GEMINI:", generationError);
            setError(generationError?.message || 'No se pudo generar la rutina.');
            setResult(null);
        } finally {
            setIsGenerating(false);
        }
    };

    const resetForm = () => {
        setForm(INITIAL_FORM);
        setResult(null);
        setError('');
        setPromptPreview(buildRoutinePrompt(INITIAL_FORM));
    };

    const displayedRoutineText = activeEntry?.routineText || result?.routineText || '';

    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-br from-slate-950 via-slate-950 to-fuchsia-950/20 shadow-2xl shadow-fuchsia-950/10">
                
                {/* HEADER */}
                <div className="border-b border-slate-800 bg-linear-to-r from-fuchsia-500/20 via-cyan-500/10 to-transparent px-6 py-6 md:px-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
                                <Sparkles size={12} /> IA de rutinas
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                                Genera y revisa el historial real de rutinas
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                                Cada rutina generada se guarda automáticamente en tu historial personal. Los videos tutoriales se cargan al instante.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 md:min-w-[360px]">
                            <InfoPill label="Objetivo" value={selectedGoalLabel} />
                            <InfoPill label="Nivel" value={selectedLevelLabel} />
                            <InfoPill label="Frecuencia" value={`${form.daysPerWeek} días/sem`} />
                        </div>
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.05fr_0.95fr] md:px-8">
                    
                    {/* FORMULARIO */}
                    <form onSubmit={handleGenerate} className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-sm font-semibold text-slate-200">Objetivo del cliente</span>
                                <select className={FIELD_STYLES} value={form.goal} onChange={(e) => updateField('goal', e.target.value)}>
                                    {GOAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-semibold text-slate-200">Nivel actual</span>
                                <select className={FIELD_STYLES} value={form.level} onChange={(e) => updateField('level', e.target.value)}>
                                    {LEVEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-sm font-semibold text-slate-200">Días por semana</span>
                                <select className={FIELD_STYLES} value={form.daysPerWeek} onChange={(e) => updateField('daysPerWeek', e.target.value)}>
                                    {DAYS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt} días</option>)}
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="text-sm font-semibold text-slate-200">Duración de sesión</span>
                                <select className={FIELD_STYLES} value={form.sessionLength} onChange={(e) => updateField('sessionLength', e.target.value)}>
                                    {LENGTH_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt} minutos</option>)}
                                </select>
                            </label>
                        </div>

                        <label className="space-y-2 block">
                            <span className="text-sm font-semibold text-slate-200">Equipo disponible</span>
                            <input className={FIELD_STYLES} value={form.equipment} onChange={(e) => updateField('equipment', e.target.value)} placeholder="Ej. gimnasio completo..." />
                        </label>

                        <label className="space-y-2 block">
                            <span className="text-sm font-semibold text-slate-200">Limitaciones o lesiones</span>
                            <input className={FIELD_STYLES} value={form.limitations} onChange={(e) => updateField('limitations', e.target.value)} placeholder="Ej. dolor de rodilla..." />
                        </label>

                        <label className="space-y-2 block">
                            <span className="text-sm font-semibold text-slate-200">Preferencias</span>
                            <input className={FIELD_STYLES} value={form.preferences} onChange={(e) => updateField('preferences', e.target.value)} placeholder="Ej. más pesas, menos cardio..." />
                        </label>

                        <label className="space-y-2 block">
                            <span className="text-sm font-semibold text-slate-200">Notas extra</span>
                            <textarea className={`${FIELD_STYLES} min-h-28 resize-y`} value={form.extraNotes} onChange={(e) => updateField('extraNotes', e.target.value)} placeholder="Agrega cualquier detalle importante." />
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button type="submit" disabled={isGenerating} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-fuchsia-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-950/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70">
                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <WandSparkles size={16} />}
                                {isGenerating ? 'Generando rutina...' : 'Generar con IA'}
                            </button>
                            <button type="button" onClick={resetForm} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
                                Limpiar formulario
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </form>

                    {/* VISTA DE RESULTADOS */}
                    <aside className="space-y-5">
                        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl shadow-slate-950/20">
                            <div className="flex items-center gap-2 text-cyan-300">
                                <History size={18} />
                                <h2 className="text-lg font-bold text-white">Historial IA</h2>
                            </div>

                            {historyLoading ? (
                                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                                    <Loader2 size={14} className="animate-spin" /> Cargando historial...
                                </div>
                            ) : historyError ? (
                                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{historyError}</div>
                            ) : history.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-8 text-center text-sm text-slate-400">Todavía no hay rutinas generadas.</div>
                            ) : (
                                <div className="mt-4 space-y-2 max-h-[240px] overflow-auto pr-1">
                                    {history.map((entry) => {
                                        const isActive = entry.id === (activeEntry?.id || selectedHistoryId);
                                        return (
                                            <button
                                                key={entry.id} type="button" onClick={() => setSelectedHistoryId(entry.id)}
                                                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${isActive ? 'border-fuchsia-500/50 bg-fuchsia-500/10' : 'border-slate-700 bg-slate-950/70 hover:border-slate-500'}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Generación</p>
                                                    <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                                                        <CalendarDays size={12} /> {formatDateTime(entry.createdAt)}
                                                    </p>
                                                </div>
                                                <p className="mt-1 text-sm text-slate-200 line-clamp-2">{entry.requestSummary || 'Solicitud sin resumen'}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* BLOQUE DE LA RESPUESTA DE LA IA (CON VIDEOS) */}
                        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl shadow-slate-950/20">
                            <div className="flex items-center gap-2 text-cyan-300 mb-4">
                                <MessageSquareText size={18} />
                                <h2 className="text-lg font-bold text-white">Respuesta de la IA</h2>
                            </div>

                            {(() => {
                                if (!displayedRoutineText) {
                                    return (
                                        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-8 text-center text-sm text-slate-400">
                                            Genera o selecciona una rutina del historial para verla aquí.
                                        </div>
                                    );
                                }

                                const rutinaObj = parsearRutinaIA(displayedRoutineText);

                                if (!rutinaObj || !rutinaObj.dias) {
                                    return <RoutineChatBubble label="Entrenador IA" content={displayedRoutineText} tone="blue" />;
                                }

                                return (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="space-y-8">
                                            {rutinaObj.dias.map((dia, indexDia) => (
                                                <div key={indexDia} className="space-y-4">
                                                    <h3 className="text-xl font-black text-fuchsia-400 border-b border-slate-700 pb-2">
                                                        {dia.titulo}
                                                    </h3>
                                                    <div className="grid gap-4 sm:grid-cols-1">
                                                        {dia.ejercicios.map((ejercicio, indexEj) => (
                                                            <div key={indexEj} className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-lg overflow-hidden flex flex-col">
                                                                <div className="mb-4">
                                                                    <h4 className="font-bold text-slate-100 text-lg">{ejercicio.nombre}</h4>
                                                                    {ejercicio.descripcion && (
                                                                        <p className="mt-2 text-sm text-slate-400">{ejercicio.descripcion}</p>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* COMPONENTE DE VIDEO CONECTADO */}
                                                                <div className="mt-auto pt-4 border-t border-slate-800">
                                                                    <VideoYouTube nombreEjercicio={ejercicio.nombre} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default ClientAIRoutineGenerator;