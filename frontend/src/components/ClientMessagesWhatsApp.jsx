import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Dumbbell, Loader2, MessageCircle, Send, Sparkles, Wrench } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import VideoYouTube from './iaRutinas/VideoYouTube';


import { useAssistant } from './asistente/ContextoAsistente';
import { auth } from '../firebase/config';
import { generateAiRoutine, subscribeAiRoutineHistory } from '../firebase/aiRoutineService';
import { suscribirCatalogoMaquinas } from '../firebase/mantenimiento';
import FormularioReporteEnChat from './mantenimiento/FormularioReporteEnChat';

const GOAL_OPTIONS = [
    { value: 'muscle_gain', label: 'Ganar masa muscular' },
    { value: 'fat_loss', label: 'Perder grasa' },
    { value: 'strength', label: 'Mejorar fuerza' },
    { value: 'endurance', label: 'Mejorar resistencia' },
    { value: 'mobility', label: 'Movilidad y prevencion' },
    { value: 'recomposition', label: 'Recomposicion corporal' },
];

const LEVEL_OPTIONS = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
];

const TIME_OPTIONS = [
    { value: '', label: 'Opcional' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '90', label: '1 hora y media' },
    { value: '120', label: '2 horas' },
    { value: '150', label: '2 horas y media' },
    { value: '180', label: '3 horas' },
];

const DAYS_PER_WEEK_OPTIONS = ['1', '2', '3', '4', '5', '6'];

function parsearRutinaIA(texto) {
    if (!texto || typeof texto !== 'string') return null;
    
    const lineas = texto.split('\n');
    const ejerciciosExtraidos = [];
    let diaActual = "Ejercicios Generales"; 
    
    const regexEjercicio = /^\d+\.\s*(.*?)\s*-\s*(.*)$/; 

    lineas.forEach(linea => {
        const lineaLimpia = linea.trim();
        
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

        const match = lineaLimpia.match(regexEjercicio); 
        if (match) {
            let nombre = match[1].trim(); 
            let descripcion = match[2].trim(); 
            let videoIdExtraido = null;

            const videoMatch = descripcion.match(/\[YT:(.*?)\]/);
            if (videoMatch) {
                videoIdExtraido = videoMatch[1]; // Guardamos el ID
                descripcion = descripcion.replace(videoMatch[0], '').trim(); 
            }

            ejerciciosExtraidos.push({
                dia: diaActual,
                nombre: nombre,
                descripcion: descripcion,
                videoId: videoIdExtraido 
            });
        } 
    }); 

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
            diasAgrupados.push({ titulo: tituloDia, ejercicios: ejerciciosDelDia });
        }
        return { objetivo: "Rutina Adaptada", dias: diasAgrupados };
    }
    
    return null; 
}

function formatBubbleTime(value) {
    try {
        const date = value?.toDate?.() || new Date(value || Date.now());
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function sanitizeNumericInput(value) {
    return String(value || '').replace(/[^0-9]/g, '');
}

function sanitizeDaysPerWeekInput(value) {
    const numeric = Number(sanitizeNumericInput(value) || 4);
    return String(Math.max(1, Math.min(6, numeric)));
}

function normalizeChatText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isGreetingOnlyMessage(value) {
    const normalized = normalizeChatText(value);
    if (!normalized) {
        return true;
    }

    const greetingPhrases = [
        'hola',
        'buenas',
        'buenos dias',
        'buenas tardes',
        'buenas noches',
        'hey',
        'saludos',
    ];

    const routineRequestWords = [
        'rutina',
        'entrenamiento',
        'ejercicio',
        'ejercicios',
        'pierna',
        'pecho',
        'espalda',
        'gluteo',
        'abdomen',
        'cardio',
        'fuerza',
        'musculo',
        'grasa',
        'objetivo',
        'quiero',
        'necesito',
    ];

    const hasGreeting = greetingPhrases.some((phrase) => (
        normalized === phrase
        || normalized.startsWith(`${phrase} `)
        || normalized.includes(` ${phrase} `)
        || normalized.endsWith(` ${phrase}`)
    ));

    const hasRoutineIntent = routineRequestWords.some((word) => normalized.includes(word));

    return hasGreeting && !hasRoutineIntent && normalized.split(' ').length <= 4;
}

function isRoutineRelatedMessage(value) {
    const normalized = normalizeChatText(value);
    if (!normalized) {
        return false;
    }

    const routineKeywords = [
        'rutina',
        'entrenamiento',
        'ejercicio',
        'ejercicios',
        'gym',
        'gimnasio',
        'musculo',
        'musculos',
        'fuerza',
        'cardio',
        'hipertrofia',
        'volumen',
        'definicion',
        'recomposicion',
        'bajar grasa',
        'perder grasa',
        'ganar masa',
        'ganar musculo',
        'objetivo',
        'pierna',
        'pecho',
        'espalda',
        'gluteo',
        'abdomen',
        'hombro',
        'biceps',
        'triceps',
        'core',
        'piernas',
        'gluteos',
        'espalda baja',
        'espalda alta',
        'pecho y espalda',
        'push',
        'pull',
        'legs',
        'plan',
        'entreno',
        'entrenar',
        'hazme',
        'armame',
        'generame',
        'creame',
        'enfocado',
        'enfocada',
    ];

    if (routineKeywords.some((keyword) => normalized.includes(keyword))) {
        return true;
    }

    const hasActionIntent = /(hazme|armame|genera|generame|crea|creame)/.test(normalized);
    const hasTrainingContext = /(rutina|plan|entreno|entrenamiento|ejercicio|ejercicios|musculo|grasa|fuerza|cardio)/.test(normalized);
    return hasActionIntent && hasTrainingContext;
}

function normalizeDurationToMinutes(value) {
    const raw = String(value || '').trim().toLowerCase().replace(',', '.');
    if (!raw) {
        return '';
    }

    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && asNumber > 0) {
        return String(Math.round(asNumber));
    }

    const hoursMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hora|horas)$/);
    if (hoursMatch) {
        const hours = Number(hoursMatch[1]);
        if (!Number.isNaN(hours) && hours > 0) {
            return String(Math.round(hours * 60));
        }
    }

    const minsMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minuto|minutos)$/);
    if (minsMatch) {
        const minutes = Number(minsMatch[1]);
        if (!Number.isNaN(minutes) && minutes > 0) {
            return String(Math.round(minutes));
        }
    }

    return '';
}

function ChatBubble({ role, text, time, pending = false }) {
    const isUser = role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`max-w-[88%] md:max-w-[72%] rounded-xl px-3 py-2 shadow-sm ${isUser
                    ? 'bg-emerald-800/80 text-emerald-50 rounded-br-sm border border-emerald-600/30'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-300/60'
                    }`}
            >
                <p className="whitespace-pre-wrap text-sm leading-5">{text}</p>
                <div className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${isUser ? 'text-emerald-200/80' : 'text-slate-500'}`}>
                    {pending && <Loader2 size={11} className="animate-spin" />}
                    <span>{time}</span>
                </div>
            </div>
        </div>
    );
}

function ClientMessagesWhatsApp() {
    const { ask, quickQuestions } = useAssistant();

    const [activeChat, setActiveChat] = useState('ia');
    const [chatInput, setChatInput] = useState('');

    const [supportMessages, setSupportMessages] = useState([
        {
            id: 'support_welcome',
            role: 'assistant',
            text: 'Hola, soy Ayuda FitData. Te puedo responder dudas sobre horarios, ubicacion y reglamento. Tambien puedo ayudarte a reportar una maquina descompuesta.',
            createdAt: Date.now(),
        },
    ]);
    const [maintenanceMessages, setMaintenanceMessages] = useState([
        {
            id: 'maintenance_welcome',
            role: 'assistant',
            text: 'Hola. Este es el apartado de Mensajes para reportar maquinas echadas a perder. Puedes abrir el formulario y enviar foto de evidencia.',
            createdAt: Date.now(),
        },
    ]);
    const [catalogoMaquinas, setCatalogoMaquinas] = useState([]);
    const [catalogoError, setCatalogoError] = useState('');

    const [aiSettings, setAiSettings] = useState({
        goal: 'recomposition',
        level: 'beginner',
        daysPerWeek: '4',
        sessionLength: '',
        equipment: 'gimnasio completo',
    });
    const [aiHistory, setAiHistory] = useState([]);
    const [localAiMessages, setLocalAiMessages] = useState([]);
    const [aiHistoryLoading, setAiHistoryLoading] = useState(true);
    const [aiHistoryError, setAiHistoryError] = useState('');
    const [aiSendError, setAiSendError] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [pendingAiPrompt, setPendingAiPrompt] = useState('');

    const chatBodyRef = useRef(null);

    useEffect(() => {
        let unsubscribeHistory = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (unsubscribeHistory) {
                unsubscribeHistory();
                unsubscribeHistory = null;
            }

            if (!user) {
                setAiHistory([]);
                setAiHistoryError('');
                setAiHistoryLoading(false);
                return;
            }

            setAiHistoryLoading(true);
            unsubscribeHistory = subscribeAiRoutineHistory(
                user.uid,
                (entries) => {
                    setAiHistory(entries);
                    setAiHistoryError('');
                    setAiHistoryLoading(false);
                },
                (error) => {
                    setAiHistoryError(error?.message || 'No se pudo cargar el historial de IA.');
                    setAiHistoryLoading(false);
                }
            );
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeHistory) {
                unsubscribeHistory();
            }
        };
    }, []);

    useEffect(() => {
        const unsubscribeCatalogo = suscribirCatalogoMaquinas(
            (maquinas) => {
                setCatalogoMaquinas(maquinas);
                setCatalogoError('');
            },
            (error) => {
                const message = String(error?.message || 'No se pudo cargar el catalogo de maquinas.');
                if (/permisos suficientes|permission|insufficient/i.test(message)) {
                    setCatalogoError('No tienes acceso al catalogo de mantenimiento con esta cuenta.');
                    return;
                }
                setCatalogoError(message);
            }
        );

        return () => unsubscribeCatalogo?.();
    }, []);

    useEffect(() => {
        setChatInput('');
    }, [activeChat]);

    const supportPreview = supportMessages[supportMessages.length - 1]?.text || 'Sin mensajes';
    const maintenancePreview = maintenanceMessages[maintenanceMessages.length - 1]?.text || 'Reporta una maquina con foto.';
    const aiPreview = aiHistory[0]?.requestSummary || 'Describe tu objetivo para generar una rutina.';

    const aiMessages = useMemo(() => {
        const knownHistoryIds = new Set(aiHistory.map((entry) => entry?.id).filter(Boolean));
        const formatted = [];

        aiHistory
            .slice()
            .reverse()
            .forEach((entry) => {
                if (entry?.requestSummary) {
                    formatted.push({
                        id: `req_${entry.id}`,
                        role: 'user',
                        text: entry.requestSummary,
                        createdAt: entry.createdAt,
                    });
                }

                if (entry?.routineText) {
                    formatted.push({
                        id: `res_${entry.id}`,
                        role: 'assistant',
                        text: entry.routineText,
                        createdAt: entry.createdAt,
                    });
                }
            });

        const pendingLocal = localAiMessages.filter((message) => !message.historyId || !knownHistoryIds.has(message.historyId));
        formatted.push(...pendingLocal);

        if (pendingAiPrompt) {
            formatted.push({
                id: 'pending_user_prompt',
                role: 'user',
                text: pendingAiPrompt,
                createdAt: Date.now(),
            });
            formatted.push({
                id: 'pending_assistant_response',
                role: 'assistant',
                text: 'Estoy armando tu rutina personalizada...',
                createdAt: Date.now(),
                pending: true,
            });
        }

        return formatted;
    }, [aiHistory, localAiMessages, pendingAiPrompt]);

    const displayedMessages = activeChat === 'ia'
        ? aiMessages
        : activeChat === 'mantenimiento'
            ? maintenanceMessages
            : supportMessages;

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [displayedMessages, activeChat]);

    const handleSupportQuickQuestion = (question) => {
        const answer = ask(question);
        setSupportMessages((prev) => [
            ...prev,
            { id: `su_${Date.now()}`, role: 'user', text: question, createdAt: Date.now() },
            { id: `sa_${Date.now()}_${Math.random()}`, role: 'assistant', text: answer, createdAt: Date.now() },
        ]);
    };

    const handleOpenMaintenanceReport = () => {
        setActiveChat('mantenimiento');
        setMaintenanceMessages((prev) => [
            ...prev,
            {
                id: `sa_report_open_${Date.now()}_${Math.random()}`,
                role: 'assistant',
                text: 'Claro. Llena el formulario de abajo para reportar la maquina descompuesta y enviar evidencia.',
                createdAt: Date.now(),
            },
        ]);
    };

    const handleReportCreated = ({ maquinaNombre, descripcion }) => {
        const createdAt = Date.now();
        setMaintenanceMessages((prev) => [
            ...prev,
            {
                id: `su_report_${createdAt}_${Math.random()}`,
                role: 'user',
                text: `Reporte de maquina: ${maquinaNombre}\nDetalle: ${descripcion}`,
                createdAt,
            },
            {
                id: `sa_report_ok_${createdAt}_${Math.random()}`,
                role: 'assistant',
                text: 'Listo, tu reporte fue enviado al panel de mantenimiento. Gracias por avisar.',
                createdAt,
            },
        ]);
    };

    const handleSend = async (event) => {
        event.preventDefault();
        const text = chatInput.trim();
        if (!text) {
            return;
        }

        setChatInput('');

        if (activeChat === 'ia' && isGreetingOnlyMessage(text)) {
            const createdAt = Date.now();
            setAiSendError('');
            setPendingAiPrompt('');
            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: 'Hola. Para generarte una rutina necesito tu objetivo, nivel y cuántos días entrenas. Por ejemplo: "quiero perder grasa, soy principiante y entreno 4 días".',
                    createdAt,
                },
            ]);
            return;
        }

        if (activeChat === 'ia' && !isRoutineRelatedMessage(text)) {
            const createdAt = Date.now();
            setAiSendError('');
            setPendingAiPrompt('');
            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: 'No tengo una función para eso. Solo puedo generar rutinas de entrenamiento. Escribe tu objetivo, nivel o grupo muscular, por ejemplo: "quiero perder grasa, soy principiante y entreno 4 días".',
                    createdAt,
                },
            ]);
            return;
        }

        if (activeChat === 'soporte') {
            const normalized = normalizeChatText(text);
            if ((normalized.includes('report') || normalized.includes('descomp')) && normalized.includes('maquina')) {
                handleOpenMaintenanceReport();
                return;
            }
            handleSupportQuickQuestion(text);
            return;
        }

        if (activeChat === 'mantenimiento') {
            handleOpenMaintenanceReport();
            return;
        }

        setIsGenerating(true);
        setAiSendError('');
        setPendingAiPrompt(text);

        try {
            const goalLabel = GOAL_OPTIONS.find((item) => item.value === aiSettings.goal)?.label || aiSettings.goal;
            const levelLabel = LEVEL_OPTIONS.find((item) => item.value === aiSettings.level)?.label || aiSettings.level;
            const safeDaysPerWeek = sanitizeDaysPerWeekInput(aiSettings.daysPerWeek);
            const safeSessionLength = normalizeDurationToMinutes(aiSettings.sessionLength);
            const conversationContext = aiMessages
                .slice(-4)
                .map((message) => `${message.role === 'user' ? 'Usuario' : 'Asistente'}: ${String(message.text || '').trim()}`)
                .join('\n')
                .trim();

            const response = await generateAiRoutine({
                ...aiSettings,
                daysPerWeek: safeDaysPerWeek,
                sessionLength: safeSessionLength,
                limitations: '',
                preferences: text,
                extraNotes: text,
                customRequest: text,
                conversationContext,
                goalLabel,
                levelLabel,
                messageIntent: 'routine_request',
            });

            const createdAt = Date.now();
            const historyId = response?.historyEntry?.id || null;
            const routineText = String(response?.routineText || '').trim();

            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                    historyId,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: routineText || 'No se pudo leer la respuesta de la IA.',
                    createdAt,
                    historyId,
                },
            ]);

            setPendingAiPrompt('');
        } catch (error) {
            const createdAt = Date.now();
            const safeErrorMessage = error?.message || 'No se pudo generar la rutina con IA.';
            setAiSendError(safeErrorMessage);
            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: `No pude generar tu rutina en este intento. ${safeErrorMessage}`,
                    createdAt,
                },
            ]);
            setPendingAiPrompt('');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full animate-fade-in">
            <div className="mx-auto h-[calc(100vh-12rem)] min-h-[560px] max-h-[840px] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0b141a] shadow-2xl">
                <div className="flex h-full flex-col md:flex-row">
                    <aside className="w-full border-b border-slate-700 bg-[#111b21] md:w-[340px] md:border-b-0 md:border-r">
                        <div className="border-b border-slate-700 px-4 py-3">
                            <h2 className="text-base font-bold text-slate-100">Mensajes</h2>
                            <p className="text-xs text-slate-400">Vista estilo chat para cliente</p>
                        </div>

                        <div className="p-2">
                            <button
                                type="button"
                                onClick={() => setActiveChat('ia')}
                                className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'ia' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
                                        <Sparkles size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-100">IA de Rutinas</p>
                                        <p className="truncate text-xs text-slate-400">{aiPreview}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveChat('soporte')}
                                className={`w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'soporte' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                                        <MessageCircle size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-100">Ayuda FitData</p>
                                        <p className="truncate text-xs text-slate-400">{supportPreview}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveChat('mantenimiento')}
                                className={`mt-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'mantenimiento' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                                        <Wrench size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-100">Reporte de Máquinas</p>
                                        <p className="truncate text-xs text-slate-400">{maintenancePreview}</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </aside>

                    <section className="flex min-h-0 flex-1 flex-col">
                        <header className="border-b border-slate-700 bg-[#202c33] px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${activeChat === 'ia' ? 'bg-cyan-500/20 text-cyan-200' : activeChat === 'mantenimiento' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                                    {activeChat === 'ia' ? <Bot size={18} /> : activeChat === 'mantenimiento' ? <Wrench size={18} /> : <MessageCircle size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-100">{activeChat === 'ia' ? 'Entrenador IA' : activeChat === 'mantenimiento' ? 'Reporte de Máquinas' : 'Ayuda y Soporte'}</p>
                                    <p className="text-xs text-slate-400">{activeChat === 'ia' ? 'Rutinas personalizadas en tiempo real' : activeChat === 'mantenimiento' ? 'Reporta maquinas dañadas con foto' : 'Preguntas frecuentes del gimnasio'}</p>
                                </div>
                            </div>

                            {activeChat === 'ia' && (
                                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                                    <label className="space-y-1">
                                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Objetivo</span>
                                        <select
                                            value={aiSettings.goal}
                                            onChange={(event) => setAiSettings((prev) => ({ ...prev, goal: event.target.value }))}
                                            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                        >
                                            {GOAL_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-1">
                                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Nivel</span>
                                        <select
                                            value={aiSettings.level}
                                            onChange={(event) => setAiSettings((prev) => ({ ...prev, level: event.target.value }))}
                                            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                        >
                                            {LEVEL_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-1">
                                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Dias</span>
                                        <select
                                            value={aiSettings.daysPerWeek}
                                            onChange={(event) => setAiSettings((prev) => ({ ...prev, daysPerWeek: sanitizeDaysPerWeekInput(event.target.value) }))}
                                            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                        >
                                            {DAYS_PER_WEEK_OPTIONS.map((value) => (
                                                <option key={value} value={value}>
                                                    {value}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="space-y-1">
                                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Tiempo</span>
                                        <select
                                            value={aiSettings.sessionLength}
                                            onChange={(event) => setAiSettings((prev) => ({ ...prev, sessionLength: event.target.value }))}
                                            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                        >
                                            {TIME_OPTIONS.map((option) => (
                                                <option key={option.value || 'optional'} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            )}
                        </header>

                        <div
                            ref={chatBodyRef}
                            className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),linear-gradient(180deg,#0b141a_0%,#0f1a20_100%)] px-3 py-4 md:px-6"
                        >
                            {activeChat === 'ia' && aiHistoryLoading && aiMessages.length === 0 && (
                                <div className="mx-auto mt-10 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                                    <Loader2 size={15} className="animate-spin" /> Cargando historial de rutinas...
                                </div>
                            )}

                            {displayedMessages.length === 0 && !aiHistoryLoading && (
                                <div className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-slate-600 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-300">
                                    Todavia no hay mensajes en esta conversacion.
                                </div>
                            )}

                            {displayedMessages.map((message) => {
                                // 1. Verificamos si este mensaje es de la IA y parece una rutina
                                const esMensajeIA = message.role === 'assistant';
                                const esRutina = message.text && (message.text.includes('Objetivo:') || message.text.includes('Rutina temporal'));
                                
                                let rutinaMapeada = null;
                                if (esMensajeIA && esRutina) {
                                    rutinaMapeada = parsearRutinaIA(message.text);
                                }

                                // 2. Si logramos parsear la rutina, dibujamos las tarjetas y los videos
                                if (rutinaMapeada && rutinaMapeada.dias) {
                                    return (
                                        <div key={message.id} className="mb-4 ml-2 mr-12 sm:mr-24 self-start animate-fade-in">
                                            <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-100 p-4 shadow-sm">
                                                <p className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                                                    <Sparkles size={14} className="text-fuchsia-600" />
                                                    Tu Rutina Personalizada
                                                </p>
                                                
                                                <div className="space-y-6">
                                                    {rutinaMapeada.dias.map((dia, indexDia) => (
                                                        <div key={indexDia} className="space-y-3">
                                                            <h3 className="font-bold text-fuchsia-700 border-b border-slate-200 pb-1">
                                                                {dia.titulo}
                                                            </h3>
                                                            <div className="grid gap-3">
                                                                {dia.ejercicios.map((ejercicio, indexEj) => (
                                                                    <div key={indexEj} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                                                        <h4 className="font-bold text-slate-800 text-sm mb-1">{ejercicio.nombre}</h4>
                                                                        <p className="text-xs text-slate-500 mb-3">{ejercicio.descripcion}</p>
                                                                        
                                                                        {/* Video del ejercicio */}
                                                                        <div className="overflow-hidden rounded-lg">
                                                                            <VideoYouTube 
                                                                                nombreEjercicio={ejercicio.nombre} 
                                                                                videoId={ejercicio.videoId} 
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="mt-1 block text-[10px] text-slate-500 px-1">
                                                {formatBubbleTime(message.createdAt)}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <ChatBubble
                                        key={message.id}
                                        role={message.role}
                                        text={message.text}
                                        time={formatBubbleTime(message.createdAt)}
                                        pending={message.pending}
                                    />
                                );
                            })}
                        </div>

                        <footer className="border-t border-slate-700 bg-[#202c33] px-3 py-3 md:px-4">
                            {activeChat === 'soporte' && (
                                <div className="mb-2 flex flex-wrap gap-2">
                                    {quickQuestions.slice(0, 4).map((question) => (
                                        <button
                                            key={question}
                                            type="button"
                                            onClick={() => handleSupportQuickQuestion(question)}
                                            className="rounded-full border border-slate-600 bg-slate-800/60 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
                                        >
                                            {question}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeChat === 'mantenimiento' && (
                                <div className="mb-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                                    Este chat queda fijo para reportar maquinas echadas a perder. Usa el formulario de abajo para elegir la maquina y adjuntar foto.
                                </div>
                            )}

                            {activeChat === 'mantenimiento' && catalogoError && (
                                <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                    {catalogoError}
                                </div>
                            )}

                            {activeChat === 'ia' && aiHistoryError && (
                                <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                    No se pudo leer el historial de rutinas con esta sesion. Aun puedes generar nuevas rutinas en este chat.
                                </div>
                            )}

                            {activeChat === 'ia' && aiSendError && (
                                <div className="mb-2 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs text-red-200">
                                    {aiSendError}
                                </div>
                            )}

                            {activeChat === 'mantenimiento' ? (
                                <FormularioReporteEnChat
                                    maquinas={catalogoMaquinas}
                                    onSuccess={handleReportCreated}
                                />
                            ) : (
                                <form onSubmit={handleSend} className="flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                                        {activeChat === 'ia' ? <Dumbbell size={16} /> : <MessageCircle size={16} />}
                                    </div>

                                    <input
                                        value={chatInput}
                                        onChange={(event) => setChatInput(event.target.value)}
                                        placeholder={activeChat === 'ia' ? 'Describe tu objetivo y te genero una rutina...' : 'Escribe tu duda...'}
                                        className="h-11 w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-400"
                                    />

                                    <button
                                        type="submit"
                                        disabled={isGenerating && activeChat === 'ia'}
                                        className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-cyan-600 px-3 text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isGenerating && activeChat === 'ia' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </form>
                            )}
                        </footer>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default ClientMessagesWhatsApp;