import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Dumbbell, Loader2, MessageCircle, Send, Sparkles, Wrench, User, Stethoscope } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "firebase/firestore";

import { useAssistant } from '../asistente/ContextoAsistente';
import { auth, db } from '../../firebase/config';
import VentanaChat from './VentanaChat';
import CentroNotificaciones from './CentroNotificaciones';
import { generarRutinaIA, suscribirHistorialRutinaIA } from '../../backend/servicioRutinasIA';
import { suscribirCatalogoMaquinas } from '../../backend/mantenimiento';
import FormularioReporteEnChat from '../mantenimiento/FormularioReporteEnChat';

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

function SoporteWhatsApp() {
    const { ask, quickQuestions } = useAssistant();

    const [activeChat, setActiveChat] = useState('ia');
    const [EntradaMensaje, setEntradaMensaje] = useState('');

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

    // --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO INICIO ---
    const [currentUser, setCurrentUser] = useState(null);
    const [trainerId, setTrainerId] = useState(null);
    const [trainerName, setTrainerName] = useState('Entrenador Asignado');
    const [nutritionistId, setNutritionistId] = useState(null);
    const [nutritionistName, setNutritionistName] = useState('Nutriólogo Asignado');
    const [showSidebarMobile, setShowSidebarMobile] = useState(true);
    const getUnifiedChatId = (uid1, uid2) => {
        if (!uid1 || !uid2) return null;
        return [uid1, uid2].sort().join('_');
    };
    // --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO FIN ---

    useEffect(() => {
        let unsubscribeHistory = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
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
            unsubscribeHistory = suscribirHistorialRutinaIA(
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
    // --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO START ---
    useEffect(() => {
        if (!currentUser?.uid) return;

        const fetchAssignments = async () => {
            console.log("--- Iniciando búsqueda de vinculaciones ---");
            console.log("Mi UID (Cliente):", currentUser.uid);
            console.log("Email del usuario actual:", currentUser.email);

            try {
                // Auditoría Nutriólogo
                const nutriQuery = query(
                    collection(db, 'client_nutritionist_assignments'), // <-- REVISA ESTA ORTOGRAFÍA
                    where('clientId', '==', currentUser.uid)
                );
                const nutriSnap = await getDocs(nutriQuery);

                console.log("¿Se encontró documento de Nutriólogo?:", !nutriSnap.empty);

                if (!nutriSnap.empty) {
                    const nutriData = nutriSnap.docs[0].data();
                    console.log("Datos de la vinculación hallada:", nutriData);

                    const nId = nutriData.nutritionistId; // <-- ¿SE LLAMA ASÍ EL CAMPO EN FIREBASE?
                    console.log("ID del nutriólogo obtenido:", nId);

                    const userDoc = await getDoc(doc(db, 'users', nId));
                    if (userDoc.exists()) {
                        console.log("Perfil del nutriólogo encontrado:", userDoc.data().displayName);
                        setNutritionistName(userDoc.data().displayName);
                        setNutritionistId(nId);
                    } else {
                        console.error("ALERTA: El ID del nutriólogo no existe en la colección 'users'");
                    }
                }
            } catch (error) {
                console.error("Error en auditoría:", error);
            }
        };

        fetchAssignments();
    }, [currentUser]);


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
        setEntradaMensaje('');
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
        const text = EntradaMensaje.trim();
        if (!text) {
            return;
        }

        setEntradaMensaje('');

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

            const response = await generarRutinaIA({
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
                    <aside className={`w-full border-b border-slate-700 bg-[#111b21] md:w-[340px] md:border-b-0 md:border-r flex-col ${showSidebarMobile ? 'flex' : 'hidden md:flex'}`}>
                        <div className="border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-100">Mensajes</h2>
                                <p className="text-xs text-slate-400">Vista estilo chat para cliente</p>
                            </div>
                            {/* --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO INICIO --- */}
                            {currentUser && <CentroNotificaciones userId={currentUser.uid} />}
                            {/* --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO FIN --- */}
                        </div>

                        <div className="p-2 overflow-y-auto">
                            {/* --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO INICIO --- */}
                            {trainerId && (
                                <button
                                    type="button"
                                    onClick={() => { setActiveChat('entrenador'); setShowSidebarMobile(false); }}
                                    className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'entrenador' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                                            <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-100">Entrenador</p>
                                            <p className="truncate text-xs text-slate-400">{trainerName}</p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {nutritionistId && (
                                <button
                                    type="button"
                                    onClick={() => { setActiveChat('nutriologo'); setShowSidebarMobile(false); }}
                                    className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'nutriologo' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                                            <Stethoscope size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-100">Nutriólogo</p>
                                            <p className="truncate text-xs text-slate-400">{nutritionistName}</p>
                                        </div>
                                    </div>
                                </button>
                            )}
                            {/* --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO FIN --- */}

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

                    {/* --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO START --- */}
                    {activeChat === 'entrenador' ? (
                        <div className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                            <VentanaChat
                                // Reemplazamos la concatenación manual por nuestra función de ordenamiento
                                chatId={getUnifiedChatId(currentUser?.uid, trainerId)}
                                currentUserId={currentUser?.uid}
                                title={trainerName}
                                subtitle="Entrenador Asignado"
                                onBack={() => setShowSidebarMobile(true)}
                            />
                        </div>
                    ) : activeChat === 'nutriologo' ? (
                        <div className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                            <VentanaChat
                                // Aplicamos exactamente la misma función para el nutriólogo
                                chatId={getUnifiedChatId(currentUser?.uid, nutritionistId)}
                                currentUserId={currentUser?.uid}
                                title={nutritionistName}
                                subtitle="Nutriólogo Asignado"
                                onBack={() => setShowSidebarMobile(true)}
                            />
                        </div>
                    ) : (
                        <section className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
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
                                className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%),linear-gradient(180deg,#0b141a_0%,#0f1a20_100%)] px-3 py-4 md:px-6"
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

                                {displayedMessages.map((message) => (
                                <ChatBubble
                                    key={message.id}
                                    role={message.role}
                                    text={message.text}
                                    time={formatBubbleTime(message.createdAt)}
                                    pending={message.pending}
                                />
                            ))}

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
                                            value={EntradaMensaje}
                                            onChange={(event) => setEntradaMensaje(event.target.value)}
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
                    )}
                    {/* --- NUEVA INTEGRACION CHAT REAL EN TIEMPO COMPARTIDO END --- */}
                </div>
            </div>
        </div>
    );
}

export default SoporteWhatsApp;